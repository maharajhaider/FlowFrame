/**
 * Integration Test for ML Service API Communication
 * 
 * This script tests the complete flow:
 * 1. Node.js → Python ML service communication
 * 2. Data transformation
 * 3. Error handling and fallbacks
 * 4. Response caching
 */

const axios = require('axios');
const mlService = require('../services/mlService');

// Test configuration
const NODE_API_BASE = 'http://localhost:8000';
const ML_SERVICE_BASE = 'http://localhost:8001';

async function runIntegrationTests() {
  console.log('🧪 Starting API Integration Tests...\n');

  // Test 1: ML Service Health Check
  console.log('Test 1: ML Service Health Check');
  try {
    const health = await mlService.healthCheck();
    console.log('✅ ML Service Health:', health);
  } catch (error) {
    console.log('❌ ML Service Health Error:', error.message);
  }

  // Test 2: Direct ML Service Communication
  console.log('\nTest 2: Direct ML Service Communication');
  try {
    const testTask = {
      id: 'test-task-123',
      title: 'Test React Component',
      description: 'Create a new React component for user authentication',
      priority: 'high',
      estimatedHours: 4,
    };

    const response = await axios.post(`${ML_SERVICE_BASE}/assign-task`, {
      task: testTask,
    });

    console.log('✅ Direct ML Assignment Response:', {
      success: response.data.success,
      assigned_to: response.data.assigned_to?.name,
      confidence: response.data.assigned_to?.confidence_score,
    });
  } catch (error) {
    console.log('❌ Direct ML Assignment Error:', error.message);
  }

  // Test 3: Node.js Assignment Endpoint
  console.log('\nTest 3: Node.js Assignment Endpoint');
  try {
    // First, create test users
    const testUsers = [
      {
        name: 'Test Developer 1',
        email: 'dev1@test.com',
        password: 'password123',
        skills: ['React', 'JavaScript', 'Node.js'],
        experience_level: 'mid',
        current_workload: 2,
        max_capacity: 8,
        availability: true,
      },
      {
        name: 'Test Developer 2', 
        email: 'dev2@test.com',
        password: 'password123',
        skills: ['Python', 'Django', 'REST APIs'],
        experience_level: 'senior',
        current_workload: 1,
        max_capacity: 8,
        availability: true,
      },
    ];

    // Create test users (but don't fail if they already exist)
    for (const user of testUsers) {
      try {
        await axios.post(`${NODE_API_BASE}/api/auth/register`, user);
        console.log(`👤 Created test user: ${user.name}`);
      } catch (error) {
        // User might already exist, that's okay
        console.log(`👤 Test user exists: ${user.name}`);
      }
    }

    // Get existing project data
    const projectResponse = await axios.get(`${NODE_API_BASE}/api/project`);
    const project = projectResponse.data;
    
    // Get the first feature and sprint from existing project
    const featureIds = Object.keys(project.features);
    const sprintIds = Object.keys(project.sprints);
    
    if (featureIds.length === 0 || sprintIds.length === 0) {
      console.log('❌ No features or sprints found in project');
      return;
    }
    
    const featureId = featureIds[0];
    const sprintId = sprintIds[0];
    
    console.log(`📦 Using existing project with feature: ${featureId}, sprint: ${sprintId}`);

    // Create a test task using existing project structure
    const taskResponse = await axios.post(`${NODE_API_BASE}/api/tasks`, {
      title: 'Integration Test ML Assignment Task',
      description: 'Testing ML assignment integration with real project data',
      priority: 'high',
      estimatedHours: 4,
      featureId: featureId,
      sprintId: sprintId,
      status: 'todo',
    });

    if (taskResponse.status === 201) {
      const taskId = taskResponse.data.id;
      console.log(`📋 Test task created: ${taskId}`);
      
      // Now try to assign it using ML
      const assignResponse = await axios.post(
        `${NODE_API_BASE}/api/tasks/${taskId}/assign`,
        { auto: true }
      );

      console.log('✅ Node.js Assignment Response:', {
        success: assignResponse.data.success,
        assigned_user: assignResponse.data.assignment?.userName,
        confidence: assignResponse.data.assignment?.confidence,
        message: assignResponse.data.message,
      });
    } else {
      console.log('❌ Failed to create test task:', taskResponse.status, taskResponse.data);
    }
  } catch (error) {
    console.log('❌ Node.js Assignment Error:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }

  // Test 4: Fallback Logic
  console.log('\nTest 4: Fallback Logic Test');
  try {
    // Temporarily break the ML service URL to test fallback
    const originalURL = mlService.baseURL;
    mlService.baseURL = 'http://localhost:9999'; // Non-existent service

    const testTask = {
      id: 'fallback-test-123',
      title: 'Fallback Test Task',
      description: 'Testing fallback assignment logic',
      priority: 'low',
      estimatedHours: 2,
    };

    // Mock team members
    const mockTeamMembers = [
      {
        _id: 'user1',
        name: 'Test User 1',
        email: 'user1@test.com',
        skills: ['React', 'Node.js'],
        current_workload: 2,
        max_capacity: 8,
        availability: true,
      },
      {
        _id: 'user2', 
        name: 'Test User 2',
        email: 'user2@test.com',
        skills: ['Python', 'Django'],
        current_workload: 6,
        max_capacity: 8,
        availability: true,
      },
    ];

    const fallbackResult = await mlService.assignTask(testTask, mockTeamMembers);
    console.log('✅ Fallback Assignment Result:', {
      success: fallbackResult.success,
      assigned_user: fallbackResult.assignment?.userName,
      confidence: fallbackResult.assignment?.confidence,
      message: fallbackResult.message,
    });

    // Restore original URL
    mlService.baseURL = originalURL;
  } catch (error) {
    console.log('❌ Fallback Test Error:', error.message);
  }

  // Test 5: Response Caching
  console.log('\nTest 5: Response Caching Test');
  try {
    const testTask = {
      id: 'cache-test-123',
      title: 'Cache Test Task',
      description: 'Testing response caching',
      priority: 'medium',
      estimatedHours: 1,
    };

    const mockTeamMembers = [
      {
        _id: 'cache-user',
        name: 'Cache Test User',
        email: 'cache@test.com',
        skills: ['Testing'],
        current_workload: 1,
        max_capacity: 8,
        availability: true,
      },
    ];

    // Clear cache first
    mlService.clearCache();

    // First call (should hit ML service)
    console.log('Making first assignment call...');
    const start1 = Date.now();
    const result1 = await mlService.assignTask(testTask, mockTeamMembers);
    const time1 = Date.now() - start1;

    // Second call (should use cache)
    console.log('Making second assignment call...');
    const start2 = Date.now();
    const result2 = await mlService.assignTask(testTask, mockTeamMembers);
    const time2 = Date.now() - start2;

    console.log('✅ Cache Test Results:', {
      first_call_time: `${time1}ms`,
      second_call_time: `${time2}ms`,
      cache_hit: time2 < time1 / 2, // Second call should be much faster
      same_result: result1.assignment?.userId === result2.assignment?.userId,
    });
  } catch (error) {
    console.log('❌ Cache Test Error:', error.message);
  }

  // Test 6: Users Skills Endpoint
  console.log('\nTest 6: Users Skills Endpoint');
  try {
    const response = await axios.get(`${ML_SERVICE_BASE}/users/skills`);
    console.log('✅ Users Skills Response:', {
      success: response.data.success,
      user_count: response.data.total_count,
      sample_user: response.data.users?.[0]?.name || 'No users',
    });
  } catch (error) {
    console.log('❌ Users Skills Error:', error.message);
  }

  console.log('\n🏁 Integration Tests Complete!');
}

// Export for use in other test files
module.exports = { runIntegrationTests };

// Run tests if script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
} 