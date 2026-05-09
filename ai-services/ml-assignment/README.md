# ML Assignment Service

Intelligent task assignment service for FlowFrame using machine learning algorithms.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js backend running on port 8000
- Docker (optional)

### 1. Install Dependencies

```bash
cd flow-frame/ai-services/ml-assignment
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
# Service Configuration
ML_SERVICE_PORT=8001
ML_SERVICE_HOST=0.0.0.0
LOG_LEVEL=INFO

# Node.js Backend Integration
MERN_API_BASE_URL=http://localhost:8000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/flowframe

# ML Model Configuration
ST_MODEL=all-MiniLM-L6-v2

# Assignment Scoring Weights (0.0 - 1.0)
SKILL_WEIGHT=0.4
WORKLOAD_WEIGHT=0.25
EXPERIENCE_WEIGHT=0.2
PRIORITY_WEIGHT=0.15

# Team Configuration
MAX_WORKLOAD=8
```

### 3. Start the Service

```bash
python main.py
```

### 4. Verify Setup

```bash
# Manual health check
curl http://localhost:8001/health
```

## API Endpoints

### Health & Status

- `GET /health` - Health check
- `GET /status` - Detailed service status
- `GET /` - Service information
- `GET /model-status` - ML model status and configuration

### ML Assignment Endpoints

- `POST /assign-task` - **Assign single task using ML algorithm**
- `POST /assign-sprint` - **Bulk assign sprint tasks**

#### Example: Single Task Assignment

```bash
curl -X POST http://localhost:8001/assign-task \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "id": "task-123",
      "title": "Build React authentication component",
      "description": "Create a secure login form using React hooks and JWT tokens",
      "priority": "high",
      "estimated_hours": 6
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Task assigned successfully using ML algorithm",
  "assigned_to": {
    "member_id": "user-456",
    "name": "Alice Johnson",
    "email": "alice@flowframe.com",
    "confidence_score": 0.847
  },
  "assignment_reasoning": {
    "skill_match": 0.692,
    "workload_availability": 0.875,
    "experience_fit": 0.8,
    "priority_alignment": 0.9
  },
  "top_candidates": [
    {
      "member_id": "user-456",
      "name": "Alice Johnson",
      "confidence_score": 0.847,
      "reasoning": "Skills: 0.69, Workload: 0.88, Experience: 0.80"
    },
    {
      "member_id": "user-789",
      "name": "Bob Chen",
      "confidence_score": 0.734,
      "reasoning": "Skills: 0.45, Workload: 0.95, Experience: 0.85"
    }
  ]
}
```

## Core ML Algorithm Features

### Implemented Features

- **Semantic Text Analysis**: Uses sentence-transformers for task description embeddings
- **Skill Matching**: Cosine similarity between task requirements and developer skills
- **Workload Balancing**: Dynamic consideration of current assignments and capacity
- **Experience Alignment**: Priority-experience matching for optimal task distribution
- **Confidence Scoring**: Weighted scoring system with explainable reasoning
- **Top 3 Candidates**: Always returns ranked list of best matches
- **Edge Case Handling**: Robust error handling for all scenarios

### ML Algorithm Details

1. **Task Embedding Generation**:

   - Converts task title + description to 384-dimensional vectors
   - Uses `all-MiniLM-L6-v2` sentence transformer model

2. **Skill Matching (40% weight)**:

   - Semantic similarity between task and developer skills
   - Returns scores 0.0-1.0 using cosine similarity
   - Accounts for role specialization (frontend, backend, etc.)

3. **Workload Balancing (25% weight)**:

   - Considers current_workload vs max_capacity ratio
   - Boosts availability for moderately loaded developers
   - Prevents overloading team members

4. **Experience Scoring (20% weight)**:

   - Aligns senior developers with high-priority tasks
   - Considers past task completion history
   - Balances learning opportunities for junior developers

5. **Priority Alignment (15% weight)**:
   - High-priority tasks prefer senior developers
   - Accounts for current availability for urgent work

## How Auto Assignment Works

### Semantic Task Understanding

The system uses a sentence transformer model (`all-MiniLM-L6-v2`) to understand tasks at a semantic level:

```python
# Convert task description to vector embedding
task_description = f"{task.title} {task.description}"
task_embedding = self.sentence_model.encode([task_description])[0]
```

This model converts text like "Build React authentication component with JWT tokens" into a 384-dimensional vector that captures the semantic meaning, context, and technical requirements of the task.

### Intelligent Skill Matching Process

For each team member, the system:

1. **Creates comprehensive skill embeddings**:

   ```python
   skills_text = ' '.join(member_skills)  # "React Node.js JavaScript TypeScript"
   if member.get('role'):
       skills_text += f" {member['role']} developer"  # "React Node.js JavaScript frontend developer"
   ```

2. **Calculates semantic similarity** using cosine similarity:
   ```python
   similarity = cosine_similarity([task_embedding], [skills_embedding])[0][0]
   score = max(0.0, (similarity + 1) / 2)  # Normalize to 0-1 range
   ```

### Automatic Task Type Detection

The system automatically detects task types through semantic understanding:

- **Frontend Tasks**: Words like "React", "component", "interface", "CSS", "responsive" → matches users with frontend skills
- **Backend Tasks**: Words like "API", "database", "server", "authentication", "microservices" → matches backend developers
- **DevOps Tasks**: Words like "deployment", "Docker", "pipeline", "CI/CD" → matches DevOps specialists
- **Testing Tasks**: Words like "testing", "automation", "QA", "selenium" → matches QA engineers
- **Design Tasks**: Words like "UI/UX", "wireframes", "prototype", "design system" → matches designers

### Experience & Past Work Analysis

The system analyzes developer experience using the `past_issues_solved` field:

```python
completed_tasks = len(member.get('past_tasks', []))
if completed_tasks > 0:
    experience_boost = min(0.2, completed_tasks * 0.02)  # More past tasks = higher score
```

**Examples from real data**:

- "Built responsive product catalog with infinite scroll" → High score for UI tasks
- "Implemented OAuth2 authentication flow" → High score for auth-related backend tasks
- "Architected scalable notification system handling 1M+ daily messages" → High score for complex backend architecture

### Advanced Scoring Algorithm

The final assignment uses a weighted multi-factor scoring system:

```python
total_score = (
    skill_score * 0.40 +      # 40%: How well skills match task requirements
    workload_score * 0.25 +   # 25%: Current availability and capacity
    experience_score * 0.20 + # 20%: Past similar work and seniority
    priority_score * 0.15     # 15%: Priority-experience alignment
)
```

### Real-World Example

**Task**: "Implement real-time chat feature using WebSockets and React"

**Analysis Process**:

1. **Semantic Understanding**: The system identifies this as a full-stack task requiring both frontend (React) and backend (WebSockets) skills
2. **Candidate Scoring**:
   - **Alice (Frontend Dev)**: Skill: 0.85, Workload: 0.60, Experience: 0.80 → **Total: 0.73**
   - **Bob (Backend Dev)**: Skill: 0.65, Workload: 0.90, Experience: 0.90 → **Total: 0.74**
   - **Charlie (Full-Stack)**: Skill: 0.90, Workload: 0.70, Experience: 0.85 → **Total: 0.82** ✅

**Result**: Charlie gets assigned because of the highest combined score, balancing all factors.

### Fallback & Error Handling

When the ML service is unavailable, the system uses intelligent fallbacks:

```javascript
// Simple fallback: assign to member with lowest workload
const availableMembers = teamMembers.filter(
  (member) =>
    member.availability && member.current_workload < member.max_capacity
);

const assigned = availableMembers.sort(
  (a, b) => a.current_workload - b.current_workload
)[0];
```

This ensures reliable task assignment even during ML service maintenance.

## Docker Usage

### Build Container

```bash
docker build -t ml-assignment .
```

### Run Container

```bash
docker run -p 8001:8001 \
  -e MERN_API_BASE_URL=http://host.docker.internal:8000 \
  ml-assignment
```

## Project Structure

```
ml-assignment/
├── main.py                    # FastAPI entry point
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── README.md                # This file
├── models/
│   ├── __init__.py
│   └── task_assignment_model.py  # Core ML logic
├── api/
│   ├── __init__.py
│   ├── assignment_routes.py      # ML assignment endpoints
│   └── data_mapper.py           # Node.js → Python data adapter
├── utils/
│   ├── __init__.py
│   └── config.py               # Configuration management
└── data/
    └── users.csv              # Test user data
```

## Integration with MERN Stack

The ML service integrates with your existing FlowFrame architecture:

```
React Frontend (3000)
    ↓
Node.js Server (8000)
    ↓
ML Assignment Service (8001)
    ↓
MongoDB (27017)
```

## Troubleshooting

### Service won't start

- Check Python version: `python --version` (should be 3.11+)
- Install dependencies: `pip install -r requirements.txt`
- Check port availability: `lsof -i :8001`

### Health check fails

- Ensure service is running: `python main.py`
- Check firewall settings
- Verify port 8001 is not blocked

### Node.js communication fails

- Start Node.js backend: `cd server && npm start`
- Verify backend health: `curl http://localhost:8000/api/hello`
- Check MERN_API_BASE_URL in config

### Docker build fails

- Update Docker to latest version
- Check Dockerfile syntax
- Ensure sufficient disk space

## Logs

The service uses structured JSON logging. Check logs for detailed information:

```bash
python main.py 2>&1 | grep -E "(ERROR|WARN|INFO)"
```
