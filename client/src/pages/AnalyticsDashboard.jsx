import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjectData } from '../redux/slices/projectSlice';
import { fetchUsers } from '../redux/slices/userSlice';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Activity,
  Target,
  FileText,
  Award,
  CalendarDays,
} from 'lucide-react';
import { canCurrentUserEdit } from '../utils/permissions';

const AnalyticsDashboard = () => {
  const dispatch = useDispatch();
  const { data: projectData, loading, error } = useSelector((state) => state.project);
  const users = useSelector((state) => state.users.data);
  const userLoading = useSelector((state) => state.users.loading);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('developer');
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    dispatch(fetchProjectData());
    dispatch(fetchUsers());
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      const isProjectManager = user.roles && user.roles.includes('project_manager');
      const canEdit = user.roles && user.roles.some(role => ['developer', 'project_manager'].includes(role));
      setUserRole(isProjectManager ? 'project_manager' : canEdit ? 'developer' : 'viewer');
    }
  }, [dispatch]);

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const tasks = projectData?.tasks ? Object.values(projectData.tasks) : [];
  const features = projectData?.features ? Object.values(projectData.features) : [];
  const sprints = projectData?.sprints ? Object.values(projectData.sprints) : [];
  const usersArray = users || [];

  // Find active sprint using state field
  const currentSprint = sprints.find(sprint => sprint.state === 'active');

  // Fallback: If no active sprint, use the most recent future sprint, then most recent sprint
  const fallbackSprint = currentSprint || 
    sprints.find(sprint => sprint.state === 'future') || 
    sprints[sprints.length - 1];



  const getUserTasks = (userId) => {
    return tasks.filter(task => task.assignee?._id === userId);
  };

  const getCompletedTasks = (taskList) => {
    return taskList.filter(task => task.status === 'done');
  };

  const getInProgressTasks = (taskList) => {
    return taskList.filter(task => task.status === 'in-progress');
  };

  const getTodoTasks = (taskList) => {
    return taskList.filter(task => task.status === 'todo');
  };

  const calculateAverageCompletionTime = (completedTasks) => {
    if (completedTasks.length === 0) return 0;
    
    const totalHours = completedTasks.reduce((sum, task) => {
      return sum + (task.estimatedHours || 0);
    }, 0);
    
    return Math.round(totalHours / completedTasks.length);
  };

  const calculateProductivityScore = (completedTasks, totalTasks) => {
    if (totalTasks.length === 0) return 0;
    return Math.round((completedTasks.length / totalTasks.length) * 100);
  };

  const calculateVelocity = (completedTasks, timeRange) => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const recentCompletedTasks = completedTasks.filter(task => 
      new Date(task.updatedAt) >= startDate
    );
    
    return recentCompletedTasks.length;
  };

  const getRecentActivity = (userId) => {
    const userTasks = getUserTasks(userId);
    return userTasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);
  };

  const getSprintProgress = () => {
    if (!fallbackSprint) return { completed: 0, total: 0, percentage: 0 };
    
    const sprintTasks = tasks.filter(task => task.sprintId === fallbackSprint._id);
    const completed = getCompletedTasks(sprintTasks).length;
    const total = sprintTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const getTopPerformersThisSprint = () => {
    if (!fallbackSprint) return [];
    
    // Get all tasks for the current sprint
    const sprintTasks = tasks.filter(task => task.sprintId === fallbackSprint._id);
    
    // Calculate performance metrics for each user in this sprint
    const userPerformance = usersArray.map(user => {
      // Handle both populated object and string ID for assignee
      const userSprintTasks = sprintTasks.filter(task => {
        if (!task.assignee) return false;
        // If assignee is a populated object, compare _id
        if (typeof task.assignee === 'object' && task.assignee._id) {
          return task.assignee._id === user._id;
        }
        // If assignee is a string ID, compare directly
        return task.assignee === user._id;
      });
      
      const userCompletedTasks = getCompletedTasks(userSprintTasks);
      const userInProgressTasks = getInProgressTasks(userSprintTasks);
      
      // Calculate time differences for completed tasks
      const timeDifferences = userCompletedTasks
        .filter(task => task.actualHours && task.estimatedHours)
        .map(task => {
          // Convert actualHours to total hours (handle both object and number formats)
          let actualHoursTotal = 0;
          if (typeof task.actualHours === 'object' && task.actualHours.hours !== undefined) {
            // New format: { hours, minutes, totalMinutes }
            actualHoursTotal = task.actualHours.hours + (task.actualHours.minutes / 60);
          } else if (typeof task.actualHours === 'number') {
            // Old format: decimal hours
            actualHoursTotal = task.actualHours;
          }
          
          const estimatedHours = task.estimatedHours || 0;
          return actualHoursTotal - estimatedHours;
        });
      
      // Calculate median of time differences
      let medianTimeDifference = 0;
      if (timeDifferences.length > 0) {
        const sortedDifferences = timeDifferences.sort((a, b) => a - b);
        const mid = Math.floor(sortedDifferences.length / 2);
        if (sortedDifferences.length % 2 === 0) {
          medianTimeDifference = (sortedDifferences[mid - 1] + sortedDifferences[mid]) / 2;
        } else {
          medianTimeDifference = sortedDifferences[mid];
        }
      }
      
      return {
        ...user,
        completedTasks: userCompletedTasks.length,
        inProgressTasks: userInProgressTasks.length,
        totalSprintTasks: userSprintTasks.length,
        medianTimeDifference: medianTimeDifference,
        timeDifferences: timeDifferences
      };
    });
    
    // Sort by median time difference (ascending - lowest is best)
    // Only include users who have completed tasks with time data

    const topPerformers = userPerformance
      .filter(user => user.completedTasks > 0 && user.timeDifferences.length > 0)
      .sort((a, b) => a.medianTimeDifference - b.medianTimeDifference)
      .slice(0, 3); // Get top 3 performers
    
    return topPerformers;
  };

  const getTeamActivity = () => {
    return tasks
      .filter(task => task.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10);
  };

  const getPriorityDistribution = (taskList) => {
    const distribution = { high: 0, medium: 0, low: 0 };
    taskList.forEach(task => {
      distribution[task.priority] = (distribution[task.priority] || 0) + 1;
    });
    return distribution;
  };

  const getStatusDistribution = (taskList) => {
    const distribution = { todo: 0, 'in-progress': 0, done: 0 };
    taskList.forEach(task => {
      distribution[task.status] = (distribution[task.status] || 0) + 1;
    });
    return distribution;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      default: return 'This Week';
    }
  };

  const DeveloperDashboard = () => {
    const userTasks = getUserTasks(currentUser?._id);
    const completedTasks = getCompletedTasks(userTasks);
    const inProgressTasks = getInProgressTasks(userTasks);
    const todoTasks = getTodoTasks(userTasks);
    const recentActivity = getRecentActivity(currentUser?._id);
    const priorityDistribution = getPriorityDistribution(userTasks);
    const statusDistribution = getStatusDistribution(userTasks);
    const productivityScore = calculateProductivityScore(completedTasks, userTasks);
    const velocity = calculateVelocity(completedTasks, timeRange);

    if (userTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Assigned</h3>
          <p className="text-gray-600 mb-6">You don't have any tasks assigned yet. Check back later for your analytics.</p>
          <button
            onClick={() => window.location.href = '/boards'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Boards
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{inProgressTasks.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productivity Score</p>
                <p className="text-3xl font-bold text-indigo-600">{productivityScore}%</p>
              </div>
              <Award className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Velocity ({timeRange})</p>
                <p className="text-3xl font-bold text-purple-600">{velocity}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-3xl font-bold text-orange-600">{todoTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
                <p className="text-3xl font-bold text-cyan-600">{calculateAverageCompletionTime(completedTasks)}h</p>
              </div>
              <CalendarDays className="w-8 h-8 text-cyan-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-600">{userTasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Current Sprint Progress
            </h3>
            {fallbackSprint ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{fallbackSprint.title}</p>
                  <p className="text-xs text-gray-500">
                    {fallbackSprint.startDate ? new Date(fallbackSprint.startDate).toLocaleDateString() : 'No start date'} - {fallbackSprint.endDate ? new Date(fallbackSprint.endDate).toLocaleDateString() : 'No end date'}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getSprintProgress().percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {getSprintProgress().completed} of {getSprintProgress().total} tasks completed
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No active sprint</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((task) => (
                <div key={task._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'done' ? 'bg-green-500' :
                    task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.status} • {formatDate(task.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">High Priority</span>
                <span className="text-sm font-medium text-red-600">{priorityDistribution.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Medium Priority</span>
                <span className="text-sm font-medium text-yellow-600">{priorityDistribution.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low Priority</span>
                <span className="text-sm font-medium text-green-600">{priorityDistribution.low}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">To Do</span>
                <span className="text-sm font-medium text-gray-600">{statusDistribution.todo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-medium text-blue-600">{statusDistribution['in-progress']}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-green-600">{statusDistribution.done}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProjectManagerDashboard = () => {
    const sprintProgress = getSprintProgress();
    const teamActivity = getTeamActivity();
    const allTasks = tasks;
    const completedTasks = getCompletedTasks(allTasks);
    const inProgressTasks = getInProgressTasks(allTasks);
    const todoTasks = getTodoTasks(allTasks);
    const priorityDistribution = getPriorityDistribution(allTasks);
    const statusDistribution = getStatusDistribution(allTasks);

    if (allTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Data</h3>
          <p className="text-gray-600 mb-6">There are no tasks in the project yet. Create some tasks to see analytics.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/epic-generator'}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Epic
            </button>
            <button
              onClick={() => window.location.href = '/boards'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Boards
            </button>
          </div>
        </div>
      );
    }

    const isSprintOnTrack = () => {
      if (!fallbackSprint || !fallbackSprint.startDate || !fallbackSprint.endDate) return true;
      
      const startDate = new Date(fallbackSprint.startDate);
      const endDate = new Date(fallbackSprint.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return true;
      
      const daysElapsed = (new Date() - startDate) / (1000 * 60 * 60 * 24);
      const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const expectedProgress = (daysElapsed / totalDays) * 100;
      return sprintProgress.percentage >= expectedProgress;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{allTasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{inProgressTasks.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-3xl font-bold text-purple-600">{usersArray.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Sprint Status
            </h3>
            {fallbackSprint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{fallbackSprint.title}</p>
                    <p className="text-xs text-gray-500">
                      {fallbackSprint.startDate ? new Date(fallbackSprint.startDate).toLocaleDateString() : 'No start date'} - {fallbackSprint.endDate ? new Date(fallbackSprint.endDate).toLocaleDateString() : 'No end date'}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isSprintOnTrack() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isSprintOnTrack() ? 'On Track' : 'Behind Schedule'}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isSprintOnTrack() ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${sprintProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{sprintProgress.completed} completed</span>
                  <span>{sprintProgress.total - sprintProgress.completed} remaining</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No active sprint</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Performers
            </h3>
            <div className="space-y-4">
              {getTopPerformersThisSprint().map((user, index) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center relative">
                      <span className="text-sm font-medium text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.completedTasks} completed tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      user.medianTimeDifference < 0 ? 'text-green-600' : 
                      user.medianTimeDifference > 0 ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {user.medianTimeDifference < 0 ? '-' : '+'}
                      {Math.abs(user.medianTimeDifference).toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500">median diff</p>
                  </div>
                </div>
              ))}
              {getTopPerformersThisSprint().length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No completed tasks with time data in this sprint</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Team Activity
          </h3>
          <div className="space-y-3">
            {teamActivity.map((task) => {
              const assignee = usersArray.find(u => u._id === task.assignee);
              return (
                <div key={task._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'done' ? 'bg-green-500' :
                    task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {assignee?.name || 'Unassigned'} • {task.status} • {formatDate(task.updatedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">High Priority</span>
                <span className="text-sm font-medium text-red-600">{priorityDistribution.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Medium Priority</span>
                <span className="text-sm font-medium text-yellow-600">{priorityDistribution.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low Priority</span>
                <span className="text-sm font-medium text-green-600">{priorityDistribution.low}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">To Do</span>
                <span className="text-sm font-medium text-gray-600">{statusDistribution.todo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-medium text-blue-600">{statusDistribution['in-progress']}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-green-600">{statusDistribution.done}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {currentUser?.name || 'User'} • {getTimeRangeLabel()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {userRole === 'project_manager' ? 'Project Manager' : 
                 canCurrentUserEdit() ? 'Developer' : 'Viewer'}
              </div>
            </div>
          </div>
        </div>

        {userRole === 'project_manager' ? <ProjectManagerDashboard /> : 
         userRole === 'developer' ? <DeveloperDashboard /> : <DeveloperDashboard />}
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 