from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel
import structlog
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config
from api.data_mapper import ProjectDataMapper

logger = structlog.get_logger()

router = APIRouter()

# Pydantic models for request/response validation
class TaskAssignmentRequest(BaseModel):
    task: Dict[str, Any]
    team_members: List[Dict[str, Any]] = None
    
class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    skills: List[str] = []
    role: str = ""
    current_workload: int = 0
    max_capacity: int = 8
    availability: bool = True
    experience_level: str = "junior"

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running
    """
    try:
        return {
            "status": "healthy",
            "service": Config.SERVICE_NAME,
            "version": Config.SERVICE_VERSION,
            "timestamp": datetime.now().isoformat(),
            "port": Config.PORT
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=500, detail="Service unhealthy")

@router.get("/status")
async def service_status():
    """
    Detailed service status for monitoring
    """
    return {
        "service": Config.SERVICE_NAME,
        "version": Config.SERVICE_VERSION,
        "status": "operational",
        "config": {
            "mern_api_url": Config.MERN_API_BASE_URL,
            "max_workload": Config.MAX_WORKLOAD_PER_MEMBER,
            "scoring_weights": {
                "skill": Config.SKILL_WEIGHT,
                "workload": Config.WORKLOAD_WEIGHT,
                "experience": Config.EXPERIENCE_WEIGHT,
                "priority": Config.PRIORITY_WEIGHT
            }
        }
    }

@router.post("/assign-task")
async def assign_task(request: TaskAssignmentRequest):
    """
    Core ML assignment endpoint - assigns task to best team member
    
    Args:
        request: TaskAssignmentRequest with task data and optional team members
        
    Returns:
        Assignment result with confidence scores and reasoning
    """
    try:
        logger.info("Received task assignment request", task_title=request.task.get('title'))
        
        # Get model instance from app state
        from main import assignment_model
        
        if not assignment_model or not assignment_model.is_initialized:
            raise HTTPException(
                status_code=503, 
                detail="ML assignment model not initialized"
            )
        
        # Use provided team members or fetch from data mapper
        team_members = request.team_members
        if not team_members:
            data_mapper = ProjectDataMapper()
            try:
                # Try to fetch from Node.js backend first
                team_members = await data_mapper.fetch_team_members()
                if not team_members:
                    # Fall back to local CSV data
                    team_members = data_mapper.load_local_users()
            finally:
                await data_mapper.close()
        
        if not team_members:
            raise HTTPException(
                status_code=400,
                detail="No team members available for assignment"
            )
        
        # Perform ML-based assignment
        result = assignment_model.assign_task(request.task, team_members)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=400,
                detail=result.get('message', 'Assignment failed')
            )
        
        logger.info(
            "Task assigned successfully",
            task_title=request.task.get('title'),
            assigned_to=result['assigned_to']['name'],
            confidence=result['assigned_to']['confidence_score']
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in task assignment endpoint", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/assign-sprint")
async def assign_sprint_tasks(tasks: List[Dict[str, Any]]):
    """
    Bulk assignment endpoint - assigns multiple tasks for a sprint
    
    Args:
        tasks: List of task objects to assign
        
    Returns:
        List of assignment results
    """
    try:
        logger.info(f"Received bulk assignment request for {len(tasks)} tasks")
        
        from main import assignment_model
        
        if not assignment_model or not assignment_model.is_initialized:
            raise HTTPException(
                status_code=503,
                detail="ML assignment model not initialized"
            )
        
        # Get team members once for all assignments
        data_mapper = ProjectDataMapper()
        try:
            team_members = await data_mapper.fetch_team_members()
            if not team_members:
                team_members = data_mapper.load_local_users()
        finally:
            await data_mapper.close()
        
        if not team_members:
            raise HTTPException(
                status_code=400,
                detail="No team members available for assignment"
            )
        
        # Process each task
        results = []
        for task in tasks:
            result = assignment_model.assign_task(task, team_members)
            results.append({
                'task_id': task.get('id'),
                'task_title': task.get('title'),
                **result
            })
            
            # Update workload for subsequent assignments
            if result.get('success'):
                assigned_member_id = result['assigned_to']['member_id']
                for member in team_members:
                    if member['id'] == assigned_member_id:
                        member['current_workload'] += task.get('estimated_hours', 1)
                        break
        
        successful_assignments = sum(1 for r in results if r.get('success'))
        logger.info(
            f"Bulk assignment completed: {successful_assignments}/{len(tasks)} successful"
        )
        
        return {
            'success': True,
            'total_tasks': len(tasks),
            'successful_assignments': successful_assignments,
            'assignments': results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in bulk assignment endpoint", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/model-status")
async def get_model_status():
    """
    Get detailed ML model status and configuration
    """
    try:
        from main import assignment_model
        
        if not assignment_model:
            return {
                'initialized': False,
                'error': 'Model not loaded'
            }
        
        return assignment_model.get_model_status()
        
    except Exception as e:
        logger.error("Error getting model status", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving model status: {str(e)}"
        )

@router.get("/users/skills")
async def get_users_with_skills():
    """
    Get all available users with their skills for assignment
    """
    try:
        logger.info("Fetching users with skills")
        
        # Get users from data mapper
        data_mapper = ProjectDataMapper()
        try:
            # Try to fetch from Node.js backend first
            team_members = await data_mapper.fetch_team_members()
            if not team_members:
                # Fall back to local CSV data
                team_members = data_mapper.load_local_users()
        finally:
            await data_mapper.close()
        
        if not team_members:
            return {
                "success": False,
                "message": "No team members found",
                "users": []
            }
        
        # Transform to skills-focused format
        users_with_skills = []
        for member in team_members:
            users_with_skills.append({
                "id": member["id"],
                "name": member["name"],
                "email": member["email"],
                "skills": member.get("skills", []),
                "role": member.get("role", "developer"),
                "experience_level": member.get("experience_level", "junior"),
                "current_workload": member.get("current_workload", 0),
                "max_capacity": member.get("max_capacity", 8),
                "availability": member.get("availability", True)
            })
        
        logger.info(f"Retrieved {len(users_with_skills)} users with skills")
        
        return {
            "success": True,
            "users": users_with_skills,
            "total_count": len(users_with_skills)
        }
        
    except Exception as e:
        logger.error("Error fetching users with skills", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching users: {str(e)}"
        )

@router.post("/users/workload")
async def update_user_workload(request: Dict[str, Any]):
    """
    Update user workload after task assignment
    
    Args:
        request: Dict with user_id and workload_change
    """
    try:
        user_id = request.get("user_id")
        workload_change = request.get("workload_change", 0)
        
        if not user_id:
            raise HTTPException(
                status_code=400,
                detail="user_id is required"
            )
        
        logger.info(f"Updating workload for user {user_id}, change: {workload_change}")
        
        # In a real implementation, this would update the user's workload
        # For now, we'll just acknowledge the update
        # This could be extended to:
        # 1. Update local cache/database
        # 2. Notify Node.js backend
        # 3. Update ML model's user data
        
        return {
            "success": True,
            "message": f"Workload updated for user {user_id}",
            "user_id": user_id,
            "workload_change": workload_change,
            "updated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating user workload", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error updating workload: {str(e)}"
        )
