const { v4: uuidv4 } = require("uuid");
const { Project } = require("../models/Project");
const Together = require("together-ai");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Sprint = require("../models/Sprint");
const fetch = (...args) => import("node-fetch").then(mod => mod.default(...args));

// LLM Provider Configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai"; // Default to OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TOGETHER_AI_KEY = process.env.TOGETHER_AI_KEY || "b1790793d629e6209ee825e097d867b891ece86eb5d9ada3c6ba65352333ebee";
const TOGETHER_MODEL = process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

// Initialize LLM clients
let openai = null;
let together = null;
let gemini = null;

if (LLM_PROVIDER === "openai" && OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  console.log("LLM Provider: OpenAI");
} else if (LLM_PROVIDER === "gemini" && GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  gemini = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  console.log("LLM Provider: Gemini");
} else if (LLM_PROVIDER === "together" || (!OPENAI_API_KEY && !GEMINI_API_KEY)) {
  together = new Together({
    apiKey: TOGETHER_AI_KEY
  });
  console.log("LLM Provider: Together AI");
} else {
  console.warn("No valid LLM provider configured. Please set OPENAI_API_KEY, GEMINI_API_KEY, or use LLM_PROVIDER=together");
}

// RAG service configuration
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8002";
const RAG_TIMEOUT_MS = parseInt(process.env.RAG_TIMEOUT_MS) || 30000; // 30 seconds
const RAG_RETRY_ATTEMPTS = parseInt(process.env.RAG_RETRY_ATTEMPTS) || 2;
const RAG_MAX_CONTEXT_LENGTH = parseInt(process.env.RAG_MAX_CONTEXT_LENGTH) || 3000;

/**
 * Enhanced fetch with timeout and retry logic
 */
async function fetchWithRetry(url, options, retries = RAG_RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.warn(`RAG service attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Upload documents to RAG service for semantic processing
 */
async function uploadDocumentsToRAG(attachments) {
  if (!attachments || attachments.length === 0) {
    console.log('No attachments provided for RAG processing');
    return [];
  }

  console.log(`Starting RAG upload for ${attachments.length} documents...`);
  const uploadResults = [];

  for (const attachment of attachments) {
    try {
      // Validate attachment
      if (!attachment.name) {
        console.warn('Attachment missing name, skipping');
        uploadResults.push({
          filename: 'unknown',
          success: false,
          error: 'Missing filename'
        });
        continue;
      }

      // For Node.js environment, we'll create a simple multipart form data
      let fileContent;
      let contentType = 'text/plain';
      
      if (attachment.content) {
        // If content is base64, decode it
        if (attachment.content.startsWith('data:')) {
          const [headerPart, base64Data] = attachment.content.split(',');
          if (!base64Data) {
            throw new Error('Invalid base64 data format');
          }
          
          const mimeMatch = headerPart.match(/data:([^;]+)/);
          if (mimeMatch) {
            contentType = mimeMatch[1];
          }
          fileContent = Buffer.from(base64Data, 'base64');
        } else {
          // Assume it's text content
          fileContent = Buffer.from(attachment.content, 'utf-8');
          contentType = attachment.type || 'text/plain';
        }
        
        // Validate file size (max 50MB as per RAG service config)
        const maxSizeBytes = 50 * 1024 * 1024;
        if (fileContent.length > maxSizeBytes) {
          throw new Error(`File size ${fileContent.length} exceeds maximum allowed size of ${maxSizeBytes} bytes`);
        }
      } else {
        console.warn(`Attachment ${attachment.name} has no content, skipping upload to RAG`);
        uploadResults.push({
          filename: attachment.name,
          success: false,
          error: 'No content provided'
        });
        continue;
      }

      // Create boundary for multipart form data
      const boundary = `----formdata-node-${Date.now()}-${Math.random().toString(36).substr(2)}`;
      
      // Build multipart form data manually
      const formParts = [];
      
      // Add file part
      formParts.push(`--${boundary}\r\n`);
      formParts.push(`Content-Disposition: form-data; name="file"; filename="${attachment.name}"\r\n`);
      formParts.push(`Content-Type: ${contentType}\r\n\r\n`);
      formParts.push(fileContent);
      formParts.push('\r\n');
      
      // Add collection_type part
      formParts.push(`--${boundary}\r\n`);
      formParts.push('Content-Disposition: form-data; name="collection_type"\r\n\r\n');
      formParts.push('documents\r\n');
      
      // Add description part
      formParts.push(`--${boundary}\r\n`);
      formParts.push('Content-Disposition: form-data; name="description"\r\n\r\n');
      formParts.push(`Document uploaded for epic generation: ${attachment.name}\r\n`);
      
      // Close boundary
      formParts.push(`--${boundary}--\r\n`);
      
      // Combine all parts
      const formData = Buffer.concat(
        formParts.map(part => Buffer.isBuffer(part) ? part : Buffer.from(part, 'utf8'))
      );

      console.log(`Uploading ${attachment.name} (${fileContent.length} bytes) to RAG service...`);
      
      const uploadResponse = await fetchWithRetry(`${RAG_SERVICE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formData.length
        },
        body: formData
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        uploadResults.push({
          filename: attachment.name,
          document_id: result.document_id,
          chunks_stored: result.chunks_stored,
          success: true
        });
        console.log(`Successfully uploaded ${attachment.name} to RAG service (${result.chunks_stored} chunks)`);
      } else {
        const errorData = await uploadResponse.text();
        const errorMessage = `HTTP ${uploadResponse.status}: ${errorData}`;
        console.error(`Failed to upload ${attachment.name} to RAG service:`, errorMessage);
        uploadResults.push({
          filename: attachment.name,
          success: false,
          error: errorMessage
        });
      }
    } catch (error) {
      const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;
      console.error(`Error uploading ${attachment.name} to RAG service:`, errorMessage);
      uploadResults.push({
        filename: attachment.name,
        success: false,
        error: errorMessage
      });
    }
  }

  const successCount = uploadResults.filter(r => r.success).length;
  console.log(`RAG upload completed: ${successCount}/${attachments.length} documents successful`);
  
  return uploadResults;
}

/**
 * Get relevant context from RAG service using semantic search
 */
async function getRAGContext(query, maxContextLength = RAG_MAX_CONTEXT_LENGTH) {
  try {
    console.log(`Retrieving RAG context for query (${query.length} chars)...`);
    
    const contextResponse = await fetchWithRetry(`${RAG_SERVICE_URL}/search/context`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        query: query,
        max_context_length: maxContextLength,
        collection_types: ['documents'] // Focus on uploaded documents
      })
    });

    if (contextResponse.ok) {
      const contextData = await contextResponse.json();
      
      if (!contextData.context || contextData.context.trim().length === 0) {
        console.warn('RAG service returned empty context');
        return {
          success: false,
          error: 'Empty context returned'
        };
      }
      
      console.log(`Retrieved RAG context: ${contextData.context_length} chars from ${contextData.sources_used} sources`);
      return {
        success: true,
        context: contextData.context,
        contextLength: contextData.context_length,
        sourcesUsed: contextData.sources_used,
        totalResults: contextData.total_results
      };
    } else {
      const errorText = await contextResponse.text();
      const errorMessage = `HTTP ${contextResponse.status}: ${errorText}`;
      console.error('Failed to retrieve context from RAG service:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;
    console.error('Error retrieving context from RAG service:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check if RAG service is available
 */
async function checkRAGServiceHealth() {
  try {
    console.log('Checking RAG service health...');
    
    const healthResponse = await fetchWithRetry(`${RAG_SERVICE_URL}/health`, {
      method: 'GET'
    }, 1); // Only 1 attempt for health check
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`RAG service healthy: ${healthData.service} v${healthData.version}`);
      return true;
    } else {
      console.warn(`RAG service health check failed: HTTP ${healthResponse.status}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error.name === 'AbortError' ? 'Health check timeout' : error.message;
    console.warn('RAG service health check failed:', errorMessage);
    return false;
  }
}

/**
 * Create fallback document context using original concatenation method
 */
function createFallbackDocumentContext(attachments) {
  if (!attachments || attachments.length === 0) {
    return '';
  }
  
  console.log('Creating fallback document context using direct concatenation');
  
  return attachments
    .filter(attachment => attachment.content) // Only include attachments with content
    .map((attachment, index) => {
      // Truncate very long content to prevent prompt overflow
      const maxContentLength = 10000; // Reasonable limit for fallback
      let content = attachment.content;
      
      if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '\n... [content truncated] ...';
        console.warn(`Truncated content for ${attachment.name} (original: ${attachment.content.length} chars)`);
      }
      
      return `\n\nDocument ${index + 1}: ${attachment.name}\nContent: ${content}`;
    })
    .join('');
}

async function getEmbedding(text) {
  const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || "http://127.0.0.1:5005/embed";
  const res = await fetch(EMBED_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ texts: [text] })
  });

  if (!res.ok) {
    throw new Error("Failed to get embedding from local server");
  }

  const embeddings = await res.json();
  return embeddings[0];
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

function preprocessPrompt(prompt) {
  return prompt.length < 10
    ? `Build a feature for: ${prompt}`
    : `Implement functionality for: ${prompt}`;
}

/**
 * Call LLM API based on configured provider
 */
async function callLLM(messages, options = {}) {
  const defaultOptions = {
    maxTokens: 4000,
    temperature: 0.7
  };
  
  const finalOptions = { ...defaultOptions, ...options };

  if (LLM_PROVIDER === "openai" && openai) {
    console.log("Using OpenAI API for LLM call");
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: messages,
        max_tokens: finalOptions.maxTokens,
        temperature: finalOptions.temperature
      });

      return response.choices?.[0]?.message?.content;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  } else if (LLM_PROVIDER === "gemini" && gemini) {
    console.log("Using Gemini API for LLM call");
    try {
      // Convert OpenAI-style messages to Gemini format
      const prompt = messages.map(msg => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `User: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          return `Assistant: ${msg.content}`;
        }
        return msg.content;
      }).join('\n\n');

      const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: finalOptions.maxTokens,
          temperature: finalOptions.temperature,
        },
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  } else if (together) {
    console.log("Using Together AI API for LLM call");
    try {
      const response = await together.chat.completions.create({
        messages: messages,
        model: process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        max_tokens: finalOptions.maxTokens,
        temperature: finalOptions.temperature,
        stream: false
      });

      return response.choices?.[0]?.message?.content;
    } catch (error) {
      console.error("Together AI API Error:", error);
      throw new Error(`Together AI API error: ${error.message}`);
    }
  } else {
    throw new Error("No LLM provider available. Please configure OPENAI_API_KEY, GEMINI_API_KEY, or set LLM_PROVIDER=together");
  }
}

async function generateSprintStructure(userPrompt, attachments = []) {
  const cleanedPrompt = preprocessPrompt(userPrompt);
  let documentContext = '';
  let contextSourceInfo = '';

  // Check if RAG service is available and we have attachments
  const ragAvailable = await checkRAGServiceHealth();
  
  if (ragAvailable && attachments && attachments.length > 0) {
    console.log('RAG service available, processing documents with semantic search...');
    
    try {
      // Upload documents to RAG service
      const uploadResults = await uploadDocumentsToRAG(attachments);
      const successfulUploads = uploadResults.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
        console.log(`Successfully uploaded ${successfulUploads.length}/${attachments.length} documents to RAG service`);
        
        // Get relevant context using semantic search
        const ragContext = await getRAGContext(cleanedPrompt, 3000); // Leave room for other prompt content
        
        if (ragContext.success && ragContext.context) {
          documentContext = ragContext.context;
          contextSourceInfo = `\n\nThis epic incorporates relevant information from ${ragContext.sourcesUsed} document sources (${ragContext.contextLength} characters of context).`;
          console.log('Using RAG-generated context for LLM prompt');
        } else {
          console.warn('RAG context retrieval failed, falling back to direct document concatenation');
          // Fallback to original method
          documentContext = createFallbackDocumentContext(attachments);
        }
      } else {
        console.warn('No documents successfully uploaded to RAG service, falling back to direct concatenation');
        // Fallback to original method
        documentContext = createFallbackDocumentContext(attachments);
      }
    } catch (error) {
      console.error('Error in RAG processing, falling back to direct document concatenation:', error.message);
      // Fallback to original method
      documentContext = createFallbackDocumentContext(attachments);
    }
  } else {
    if (!ragAvailable) {
      console.log('RAG service not available, using direct document concatenation');
    }
    
    // Use original method for direct document concatenation
    if (attachments && attachments.length > 0) {
      documentContext = createFallbackDocumentContext(attachments);
    }
  }

  // Build the message content
  let messageContent = `You're a senior software engineer planning sprint tasks for an epic.

Based on the epic: "${cleanedPrompt}"

Generate 2-4 sprints. For each sprint, generate 2-4 features. Each feature can span multiple sprints if it's too large.

For features that span multiple sprints, break them down into smaller, sprint-specific tasks.

A feature can appear in multiple sprints with different tasks in each sprint. Each task will be linked to its feature and sprint using the feature ID and sprint ID, so the same feature ID can appear across multiple sprints.

Return JSON in this format:

[
  {
    "sprintTitle": "string",
    "sprintDescription": "string",
    "features": [
      {
        "featureTitle": "string",
        "featureDescription": "string",
        "priority": "low" | "medium" | "high",
        "sprintSpecificTasks": [
          {
            "title": "string",
            "description": "string",
            "priority": "low" | "medium" | "high",
            "estimatedHours": number
          }
        ]
      }
    ]
  }
]

Guidelines:
- If a feature is too large for one sprint, include that feature in multiple sprints and create sprint-specific tasks
- Each sprint should have 2-4 features
- Each feature should have 2-4 tasks for that specific sprint
- Tasks should be concrete and actionable
- Estimated hours should be realistic (1-8 hours per task)
- A feature can appear in multiple sprints with different tasks in each sprint. Each task will be linked to its feature and sprint using the feature ID and sprint ID, so the same feature ID can appear across multiple sprints.
- Do not include Sprint number in the sprintTitle 

Task Guidelines:
- Assume the project is already set up with all necessary frameworks, libraries, and project structure
- Make task titles very specific and actionable (e.g., "Create User model with Mongoose schema", "Implement JWT authentication middleware", "Add React Router navigation to header component")
- Write detailed descriptions that explain exactly what the developer needs to do
- Include specific library/framework details when applicable (e.g., "Use bcrypt for password hashing", "Implement with React Hook Form for validation", "Use Express.js middleware for CORS")
- Break down complex tasks into smaller, manageable pieces
- Include file paths, component names, or specific functions to create/modify
- Mention any dependencies, imports, or configurations needed
- Specify expected inputs/outputs or API endpoints when relevant
- Focus on implementing features, not setting up the project structure
- Avoid using URLs in task titles - mention library names without URLs (e.g., "Use Faker.js for mock data" instead of "https://faker.js/ generated mock data")
- Use lowercase priority values: "low", "medium", "high" (not "Low", "Medium", "High")
- Consider the context from attached documents when generating tasks and features

Do NOT add any extra text. Just the raw JSON array.`;

  // Add document context to the message
  if (documentContext) {
    messageContent += documentContext;
  }

  // Add context source information if using RAG
  if (contextSourceInfo) {
    messageContent += contextSourceInfo;
  }

  const messages = [
    {
      role: "user",
      content: messageContent
    }
  ];

  try {
    console.log(`Generating sprint structure using ${LLM_PROVIDER.toUpperCase()} provider...`);
    const rawReply = await callLLM(messages, {
      maxTokens: 4000,
      temperature: 0.7
    });

    if (!rawReply) {
      throw new Error(`No response content from ${LLM_PROVIDER.toUpperCase()} API`);
    }

  try {
    let cleanedReply = rawReply.replace(/```json/g, "").replace(/```/g, "").trim();
    let sprintsFromLLM = JSON.parse(cleanedReply);

    const sprints = {};
    const features = {};
    const tasks = {};
    const seenEmbeddings = [];
    const baseDate = new Date();

    for (let sprintIndex = 0; sprintIndex < sprintsFromLLM.length; sprintIndex++) {
      const sprintData = sprintsFromLLM[sprintIndex];
      const sprintId = uuidv4();
      const featureIds = [];
      let project = await Project.findOne({});
      let lastSprint = null;
      
      if (project && project.sprintIds && project.sprintIds.length > 0) {
        const lastSprintId = project.sprintIds[project.sprintIds.length - 1];
        lastSprint = await Sprint.findById(lastSprintId);
      }

      const sprintStartDate = lastSprint ? new Date(lastSprint.endDate.getTime() + 24 * 60 * 60 * 1000) : new Date(baseDate);
      sprintStartDate.setDate(sprintStartDate.getDate() + sprintIndex * 14);
      const sprintEndDate = new Date(sprintStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + 13);

      for (const featureData of sprintData.features) {
        const featureId = uuidv4();
        const taskIds = [];

        for (const task of featureData.sprintSpecificTasks) {
            try {
          const taskEmbedding = await getEmbedding(task.title);
          const isSimilar = seenEmbeddings.some(existing =>
            cosineSimilarity(taskEmbedding, existing.embedding) > 0.9
          );
          if (isSimilar) {
            console.warn(`Skipped semantically similar task: "${task.title}"`);
            continue;
          }

          seenEmbeddings.push({ title: task.title, embedding: taskEmbedding });
            } catch (embedError) {
              console.warn(`Failed to get embedding for task: "${task.title}", continuing without similarity check`);
            }

          const taskId = uuidv4();
          tasks[taskId] = {
            id: taskId,
            title: task.title,
            description: task.description,
            estimatedHours: task.estimatedHours || 2,
            inProgressStartTime: null,
            assignee: null,
            priority: (task.priority || "medium").toLowerCase(),
            status: "todo",
            featureId,
            sprintId
          };
          taskIds.push(taskId);
        }

        features[featureId] = {
          id: featureId,
          title: featureData.featureTitle,
          description: featureData.featureDescription,
          priority: (featureData.priority || "medium").toLowerCase(),
          taskIds,
        };
        featureIds.push(featureId);
      }

      sprints[sprintId] = {
        id: sprintId,
        title: sprintData.sprintTitle || `Sprint ${sprintIndex + 1}`,
        description: sprintData.sprintDescription || `Generated from: "${userPrompt}"`,
        featureIds,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        state: 'future'
      };
    }

    return { sprints, features, tasks };
  } catch (err) {
    console.error("JSON parse failed:\n", err);
    console.log("Raw reply:\n", rawReply);
    throw new Error('Failed to parse LLM response. Server error. Please try again later.');
    }
  } catch (error) {
    console.error(`${LLM_PROVIDER.toUpperCase()} API Error:`, error);
    throw new Error(`${LLM_PROVIDER.toUpperCase()} API error: ${error.message}`);
  }
}

module.exports = { generateSprintStructure };
