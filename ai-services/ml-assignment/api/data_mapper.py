import httpx
import structlog
import pandas as pd
import os
import sys
from typing import List, Dict, Optional

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.config import Config

logger = structlog.get_logger()

class ProjectDataMapper:
    """
    Data mapper to interface with Node.js MERN backend
    Handles data transformation between Node.js and Python ML service
    """
    
    def __init__(self, api_base_url: str = None):
        self.api_base_url = api_base_url or Config.MERN_API_BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_team_members(self) -> List[Dict]:
        """
        Fetch users from Node.js auth system and map to ML format
        """
        try:
            # Fetch real user data from Node.js backend
            response = await self.client.get(f"{self.api_base_url}/api/auth/users")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('users'):
                    users = data['users']
                    logger.info(f"Successfully fetched {len(users)} users from Node.js backend")
                                
                    # Transform users to ML format (they're already in the right format from Node.js)
                    return users
                else:
                    logger.warning("Node.js returned success=false or no users")
                    return []
            else:
                logger.error("Failed to fetch users from Node.js backend", 
                           status=response.status_code, 
                           response=response.text[:200])
                return []
                
        except Exception as e:
            logger.error("Error fetching users from Node.js backend", error=str(e))
            return []
    
    def load_local_users(self) -> List[Dict]:
        """
        Load users from local CSV file for testing
        Uses the users.csv data with ML fields
        """
        try:
            csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "users.csv")
            
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                users = []
                
                for _, row in df.iterrows():
                    # Parse skills from the new skills array field
                    skills = self._parse_skills_array(row.get('skills', '[]'))
                    
                    # Convert string boolean to actual boolean
                    availability = str(row.get('availability', 'true')).lower() == 'true'
                    
                    users.append({
                        "id": row['_id'],
                        "name": row['name'],
                        "email": row['email'],
                        "role": row['role'],
                        "skills": skills,
                        "current_workload": int(row.get('current_workload', 0)),
                        "max_capacity": int(row.get('max_capacity', 8)),
                        "availability": availability,
                        "experience_level": row.get('experience_level', 'junior')
                    })
                
                logger.info(f"Loaded {len(users)} users from CSV with ML fields")
                return users
            else:
                logger.warning("Users CSV file not found")
                return []
                
        except Exception as e:
            logger.error("Error loading users from CSV", error=str(e))
            return []
    
    def _parse_skills_array(self, skills_str: str) -> List[str]:
        """Parse skills array from CSV string format"""
        if not skills_str or skills_str == 'nan':
            return []
        
        try:
            # Handle string representation of Python list
            import ast
            if skills_str.startswith('[') and skills_str.endswith(']'):
                skills_list = ast.literal_eval(skills_str)
                return [str(skill).strip() for skill in skills_list if skill]
            else:
                # Fallback: split by comma if not in list format
                return [skill.strip() for skill in skills_str.split(',') if skill.strip()]
        except Exception as e:
            logger.warning(f"Failed to parse skills array: {skills_str}", error=str(e))
            return []
    
    def _extract_skills(self, skill_description: str) -> List[str]:
        """Extract skill keywords from skill description"""
        if not skill_description or skill_description == 'nan':
            return []
        
        # Enhanced skill extraction with more comprehensive skill set
        common_skills = [
            'React', 'Node.js', 'JavaScript', 'Python', 'Django', 'Express',
            'MongoDB', 'MySQL', 'UI/UX', 'Design', 'Testing', 'Selenium',
            'Java', 'Spring Boot', 'Project Management', 'Agile', 'Scrum',
            'Adobe XD', 'Sketch', 'Figma', 'REST APIs', 'Frontend', 'Backend',
            'Full Stack', 'DevOps', 'CI/CD', 'Docker', 'Kubernetes',
            'TypeScript', 'Vue.js', 'Angular', 'PostgreSQL', 'Redis',
            'GraphQL', 'AWS', 'Azure', 'GCP', 'Terraform', 'Jenkins'
        ]
        
        found_skills = []
        description_lower = skill_description.lower()
        
        for skill in common_skills:
            if skill.lower() in description_lower:
                found_skills.append(skill)
        
        return found_skills
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
