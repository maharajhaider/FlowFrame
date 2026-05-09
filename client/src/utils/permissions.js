export const canEdit = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => ['developer', 'project_manager'].includes(role));
};

export const isProjectManager = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.includes('project_manager');
};

export const isDeveloper = (user) => {
  if (!user || !user.roles) return false;
  return user.roles.includes('developer');
};

export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const canCurrentUserEdit = () => {
  const user = getCurrentUser();
  return canEdit(user);
};

export const isCurrentUserProjectManager = () => {
  const user = getCurrentUser();
  return isProjectManager(user);
};

export const isCurrentUserDeveloper = () => {
  const user = getCurrentUser();
  return isDeveloper(user);
}; 