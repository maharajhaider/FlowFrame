const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class MLService {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.timeout = 2000; // 2 seconds as per DOD
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Transform Node.js task data to Python format
   */
  transformTaskToPython(task, teamMembers = []) {
    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        estimated_hours: task.estimatedHours || 0,
        feature_id: task.featureId,
        sprint_id: task.sprintId,
      },
      team_members: teamMembers.map(member => ({
        id: member._id.toString(),
        name: member.name,
        email: member.email,
        skills: member.skills || [],
        role: member.roles?.[0] || 'developer',
        current_workload: member.current_workload || 0,
        max_capacity: member.max_capacity || 8,
        availability: member.availability !== false,
        experience_level: member.experience_level || 'junior',
        past_tasks: member.past_issues_solved || [],
      })),
    };
  }

  /**
   * Transform Python response to Node.js format
   */
  transformResponseFromPython(pythonResponse) {
    if (!pythonResponse.success) {
      return {
        success: false,
        message: pythonResponse.message,
      };
    }

    return {
      success: true,
      assignment: {
        userId: pythonResponse.assigned_to.member_id,
        userName: pythonResponse.assigned_to.name,
        userEmail: pythonResponse.assigned_to.email,
        userRole: pythonResponse.assigned_to.role || 'developer',
        userSkills: pythonResponse.assigned_to.skills || [],
        confidence: pythonResponse.assigned_to.confidence_score,
        reasoning: pythonResponse.assignment_reasoning,
      },
      alternatives: pythonResponse.top_candidates || [],
      message: pythonResponse.message,
    };
  }

  /**
   * Assign task using ML algorithm
   */
  async assignTask(task, teamMembers = []) {
    const cacheKey = `assign_${task.id}_${teamMembers.map(m => m._id).join('_')}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('📋 Returning cached ML assignment result');
      return cached;
    }

    try {
      console.log('🤖 Calling ML service for task assignment...');
      const requestData = this.transformTaskToPython(task, teamMembers);
      
      const response = await this.client.post('/assign-task', requestData);
      const result = this.transformResponseFromPython(response.data);
      
      // Cache successful results
      if (result.success) {
        cache.set(cacheKey, result);
      }
      
      console.log('✅ ML assignment successful:', result.assignment?.userName);
      return result;
      
    } catch (error) {
      console.error('❌ ML service error:', error.message);
      
      // Fallback to simple assignment
      return this.fallbackAssignment(task, teamMembers);
    }
  }

  /**
   * Fallback assignment logic when ML service is unavailable
   */
  fallbackAssignment(task, teamMembers) {
    console.log('🔄 Using fallback assignment logic');
    
    if (!teamMembers || teamMembers.length === 0) {
      return {
        success: false,
        message: 'No team members available for assignment',
      };
    }

    // Simple fallback: assign to member with lowest workload
    const availableMembers = teamMembers.filter(member => 
      member.availability !== false && 
      (member.current_workload || 0) < (member.max_capacity || 8)
    );

    if (availableMembers.length === 0) {
      return {
        success: false,
        message: 'No available team members with capacity',
      };
    }

    // Sort by workload (ascending) and pick the first one
    const assigned = availableMembers.sort((a, b) => 
      (a.current_workload || 0) - (b.current_workload || 0)
    )[0];

    return {
      success: true,
      assignment: {
        userId: assigned._id.toString(),
        userName: assigned.name,
        userEmail: assigned.email,
        userRole: assigned.roles?.[0] || 'developer',
        userSkills: assigned.skills || [],
        confidence: 0.5, // Lower confidence for fallback
        reasoning: {
          method: 'fallback',
          reason: 'ML service unavailable - assigned to member with lowest workload',
        },
      },
      alternatives: [],
      message: 'Task assigned using fallback logic (ML service unavailable)',
    };
  }

  /**
   * Get users with skills from ML service
   */
  async getUsersWithSkills() {
    const cacheKey = 'users_with_skills';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/users/skills');
      const result = response.data;
      
      // Cache for 2 minutes (shorter cache for user data)
      cache.set(cacheKey, result, 120);
      return result;
      
    } catch (error) {
      console.error('Error fetching users with skills:', error.message);
      throw new Error('Failed to fetch users from ML service');
    }
  }

  /**
   * Update user workload in ML service
   */
  async updateUserWorkload(userId, workloadChange) {
    try {
      const response = await this.client.post('/users/workload', {
        user_id: userId,
        workload_change: workloadChange,
      });
      
      // Clear cache when workload changes
      cache.flushAll();
      
      return response.data;
      
    } catch (error) {
      console.error('Error updating user workload:', error.message);
      // Don't throw here - workload update is not critical
      console.warn('⚠️ Workload update failed, continuing...');
      return { success: false, message: error.message };
    }
  }

  /**
   * Health check for ML service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        available: true,
        status: response.data.status,
        version: response.data.version,
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    cache.flushAll();
  }
}

module.exports = new MLService(); 