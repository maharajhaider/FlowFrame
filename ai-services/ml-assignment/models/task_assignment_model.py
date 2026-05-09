import structlog
import sys
import os
import numpy as np
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config

logger = structlog.get_logger()

class TaskAssignmentModel:
    """
    Intelligent task assignment model using ML
    """
    
    def __init__(self):
        self.config = Config()
        self.sentence_model = None
        self.team_data = None
        self.skill_embeddings = {}
        self.is_initialized = False
        logger.info("TaskAssignmentModel instance created")
    
    def initialize(self):
        """
        Initialize the ML model and load sentence transformer
        """
        try:
            logger.info("Initializing TaskAssignmentModel with ML components...")
            
            # Load sentence transformer model
            logger.info(f"Loading sentence transformer: {self.config.SENTENCE_TRANSFORMER_MODEL}")
            self.sentence_model = SentenceTransformer(self.config.SENTENCE_TRANSFORMER_MODEL)
            
            # Pre-compute common skill embeddings
            self._precompute_skill_embeddings()
            
            self.is_initialized = True
            logger.info("TaskAssignmentModel initialized successfully with ML capabilities")
            return True
            
        except Exception as e:
            logger.error("Failed to initialize TaskAssignmentModel", error=str(e))
            return False
    
    def _precompute_skill_embeddings(self):
        """Pre-compute embeddings for common skills to improve performance"""
        common_skills = [
            'React', 'Node.js', 'JavaScript', 'Python', 'Django', 'Express',
            'MongoDB', 'MySQL', 'UI/UX', 'Design', 'Testing', 'Selenium',
            'Java', 'Spring Boot', 'Project Management', 'Agile', 'Scrum',
            'Adobe XD', 'Sketch', 'Figma', 'REST APIs', 'Frontend', 'Backend',
            'Full Stack', 'DevOps', 'CI/CD', 'Docker', 'Kubernetes'
        ]
        
        try:
            embeddings = self.sentence_model.encode(common_skills)
            self.skill_embeddings = {
                skill: embedding for skill, embedding in zip(common_skills, embeddings)
            }
            logger.info(f"Pre-computed embeddings for {len(common_skills)} common skills")
        except Exception as e:
            logger.error("Failed to pre-compute skill embeddings", error=str(e))
            self.skill_embeddings = {}
    
    def assign_task(self, task_data: Dict, team_members: List[Dict]) -> Dict:
        """
        Assign task to best suited team member using ML algorithm
        
        Args:
            task_data: Dict with task information (title, description, priority, etc.)
            team_members: List of team members with skills, workload, etc.
            
        Returns:
            Dict with assignment results and top candidates
        """
        if not self.is_initialized:
            return {
                'success': False,
                'message': 'Model not initialized'
            }
        
        if not team_members:
            return {
                'success': False,
                'message': 'No team members available for assignment'
            }
        
        try:
            logger.info(f"Assigning task: {task_data.get('title', 'Unknown')}")
            
            # Calculate scores for each team member
            candidates = self._calculate_assignment_scores(task_data, team_members)
            
            # Sort by total score (descending)
            candidates.sort(key=lambda x: x['total_score'], reverse=True)
            
            # Get top 3 candidates
            top_candidates = candidates[1:4]
            
            # Handle edge cases
            if not candidates:
                return {
                    'success': False,
                    'message': 'No suitable candidates found'
                }
            
            best_candidate = candidates[0]
            
            # Check if confidence is reasonable
            if best_candidate['total_score'] < 0.3:
                logger.warning("Low confidence assignment", score=best_candidate['total_score'])
            
            return {
                'success': True,
                'message': 'Task assigned successfully using ML algorithm',
                'assigned_to': {
                    'member_id': best_candidate['id'],
                    'name': best_candidate['name'],
                    'email': best_candidate['email'],
                    'role': best_candidate.get('role', 'developer'),
                    'skills': best_candidate.get('skills', []),
                    'confidence_score': float(round(best_candidate['total_score'], 3))
                },
                'assignment_reasoning': {
                    'skill_match': float(round(best_candidate['skill_score'], 3)),
                    'workload_availability': float(round(best_candidate['workload_score'], 3)),
                    'experience_fit': float(round(best_candidate['experience_score'], 3)),
                    'priority_alignment': float(round(best_candidate['priority_score'], 3))
                },
                'top_candidates': [
                    {
                        'member_id': candidate['id'],
                        'name': candidate['name'],
                        'role': candidate.get('role', 'developer'),
                        'skills': candidate.get('skills', []),
                        'confidence_score': float(round(candidate['total_score'], 3)),
                        'reasoning': f"Skills: {float(round(candidate['skill_score'], 2))}, "
                                   f"Workload: {float(round(candidate['workload_score'], 2))}, "
                                   f"Experience: {float(round(candidate['experience_score'], 2))}"
                    }
                    for candidate in top_candidates
                ]
            }
            
        except Exception as e:
            logger.error("Error during task assignment", error=str(e))
            return {
                'success': False,
                'message': f'Assignment failed: {str(e)}'
            }
    
    def _calculate_assignment_scores(self, task_data: Dict, team_members: List[Dict]) -> List[Dict]:
        """
        Calculate assignment scores for all team members
        
        Returns:
            List of team members with calculated scores
        """
        task_description = f"{task_data.get('title', '')} {task_data.get('description', '')}"
        task_priority = task_data.get('priority', 'medium')
        
        # Generate task embedding
        task_embedding = self.sentence_model.encode([task_description])[0]
        
        candidates = []
        
        for member in team_members:
            if not member.get('availability', True):
                continue  # Skip unavailable members
            
            # Calculate individual scores
            skill_score = self._calculate_skill_score(task_embedding, member)
            workload_score = self._calculate_workload_score(member)
            experience_score = self._calculate_experience_score(member, task_priority)
            priority_score = self._calculate_priority_score(member, task_priority)
            
            # Calculate weighted total score with realistic variation
            base_total = float(
                skill_score * self.config.SKILL_WEIGHT +
                workload_score * self.config.WORKLOAD_WEIGHT +
                experience_score * self.config.EXPERIENCE_WEIGHT +
                priority_score * self.config.PRIORITY_WEIGHT
            )
            
            # Add small variation to prevent perfect scores and make results more realistic
            import random
            variation = random.uniform(-0.05, 0.02)  # Small negative bias to reduce inflated scores
            total_score = max(0.0, min(0.95, base_total + variation))  # Cap at 95%
            
            candidates.append({
                **member,
                'skill_score': float(skill_score),
                'workload_score': float(workload_score),
                'experience_score': float(experience_score),
                'priority_score': float(priority_score),
                'total_score': float(total_score)
            })
        
        return candidates
    
    def _calculate_skill_score(self, task_embedding: np.ndarray, member: Dict) -> float:
        """
        Calculate skill matching score using semantic similarity
        
        Args:
            task_embedding: Task description embedding
            member: Team member data
            
        Returns:
            Skill score between 0 and 1
        """
        try:
            member_skills = member.get('skills', [])
            if not member_skills:
                return 0.0
            
            # Create skills description
            skills_text = ' '.join(member_skills)
            if member.get('role'):
                skills_text += f" {member['role']} developer"
            
            # Generate member skills embedding
            skills_embedding = self.sentence_model.encode([skills_text])[0]
            
            # Calculate cosine similarity
            similarity = cosine_similarity(
                [task_embedding], 
                [skills_embedding]
            )[0][0]
            
            # Normalize to 0-1 range with more realistic scoring
            # Only positive similarities get meaningful scores
            if similarity > 0:
                score = float(similarity)  # Direct use of positive similarity
            else:
                score = 0.0  # No match for negative or zero similarity
            
            return score
            
        except Exception as e:
            logger.error("Error calculating skill score", error=str(e))
            return 0.0
    
    def _calculate_workload_score(self, member: Dict) -> float:
        """
        Calculate workload availability score
        
        Args:
            member: Team member data
            
        Returns:
            Workload score between 0 and 1 (1 = fully available)
        """
        try:
            current_workload = member.get('current_workload', 0)
            max_capacity = member.get('max_capacity', self.config.MAX_WORKLOAD_PER_MEMBER)
            
            if max_capacity <= 0:
                return 0.0
            
            # Calculate availability ratio
            utilization = current_workload / max_capacity
            
            # Return inverse utilization (higher availability = higher score)
            availability_score = max(0.0, 1.0 - utilization)
            
            return float(availability_score)
            
        except Exception as e:
            logger.error("Error calculating workload score", error=str(e))
            return 0.5  # Default to medium availability
    
    def _calculate_experience_score(self, member: Dict, task_priority: str) -> float:
        """
        Calculate experience alignment score
        
        Args:
            member: Team member data
            task_priority: Task priority level
            
        Returns:
            Experience score between 0 and 1
        """
        try:
            experience_level = member.get('experience_level', 'junior')
            
            # Experience weights based on task priority (more realistic scoring)
            experience_weights = {
                'high': {'senior': 0.9, 'mid': 0.6, 'junior': 0.2},
                'medium': {'senior': 0.8, 'mid': 0.9, 'junior': 0.5},
                'low': {'senior': 0.7, 'mid': 0.8, 'junior': 0.9}
            }
            
            # Get base score from experience-priority matrix
            base_score = experience_weights.get(task_priority, {}).get(
                experience_level, 0.5
            )
            
            # Factor in completed tasks count if available (reduced boost)
            completed_tasks = len(member.get('past_tasks', []))
            if completed_tasks > 0:
                experience_boost = min(0.1, completed_tasks * 0.01)  # Reduced boost
                base_score = min(0.85, base_score + experience_boost)  # Cap at 85%
            
            return float(base_score)
            
        except Exception as e:
            logger.error("Error calculating experience score", error=str(e))
            return 0.5
    
    def _calculate_priority_score(self, member: Dict, task_priority: str) -> float:
        """
        Calculate priority alignment score
        
        Args:
            member: Team member data
            task_priority: Task priority level
            
        Returns:
            Priority score between 0 and 1
        """
        try:
            # Base score for handling different priority tasks (more realistic)
            priority_base_scores = {
                'high': 0.5,
                'medium': 0.6,
                'low': 0.7
            }
            
            base_score = priority_base_scores.get(task_priority, 0.5)
            
            # Small boost for senior members on high priority tasks
            if (task_priority == 'high' and 
                member.get('experience_level') == 'senior'):
                base_score = min(0.75, base_score + 0.1)  # Reduced boost and cap
            
            # Very small boost for less loaded members on high priority tasks
            current_workload = member.get('current_workload', 0)
            max_capacity = member.get('max_capacity', self.config.MAX_WORKLOAD_PER_MEMBER)
            
            if task_priority == 'high' and current_workload < (max_capacity * 0.5):
                base_score = min(0.8, base_score + 0.05)  # Much smaller boost and cap
            
            return float(base_score)
            
        except Exception as e:
            logger.error("Error calculating priority score", error=str(e))
            return 0.5
    
    def get_model_status(self) -> Dict:
        """Get current model status and ML capabilities"""
        return {
            'initialized': self.is_initialized,
            'ml_enabled': self.sentence_model is not None,
            'service': self.config.SERVICE_NAME,
            'version': self.config.SERVICE_VERSION,
            'model_info': {
                'sentence_transformer': self.config.SENTENCE_TRANSFORMER_MODEL,
                'skill_embeddings_cached': len(self.skill_embeddings),
                'ml_components': ['sentence-transformers', 'scikit-learn', 'numpy']
            },
            'scoring_config': {
                'skill_weight': self.config.SKILL_WEIGHT,
                'workload_weight': self.config.WORKLOAD_WEIGHT,
                'experience_weight': self.config.EXPERIENCE_WEIGHT,
                'priority_weight': self.config.PRIORITY_WEIGHT
            }
        }
