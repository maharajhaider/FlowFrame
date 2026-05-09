import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectData, startSprint, completeSprint } from '../redux/slices/projectSlice';
import { Calendar, Play, Square, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

const SprintBoard = () => {
  const dispatch = useDispatch();
  const { data: projectData, loading } = useSelector((state) => state.project);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    dispatch(fetchProjectData());
  }, [dispatch]);

  const handleStartSprint = async (sprintId) => {
    try {
      await dispatch(startSprint(sprintId)).unwrap();
      dispatch(fetchProjectData());
    } catch (error) {
      console.error('Failed to start sprint:', error);
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await dispatch(completeSprint(sprintId)).unwrap();
      dispatch(fetchProjectData());
    } catch (error) {
      console.error('Failed to complete sprint:', error);
    }
  };

  const migrateLegacySprints = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/projects/migrate-sprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        dispatch(fetchProjectData());
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setMigrating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate, endDate) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    if (start === 'No date' || end === 'No date') return 'No date - No date';
    return `${start} - ${end}`;
  };

  const getSprintStatus = (sprint) => {
    if (sprint.state === 'active') return 'active';
    if (sprint.state === 'completed') return 'completed';
    return 'future';
  };

  const getSprintTasks = (sprintId) => {
    if (!projectData?.tasks) return [];
    return Object.values(projectData.tasks).filter(task => task.sprintId === sprintId);
  };

  const getSprintProgress = (tasks) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.status === 'done').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getSprintStats = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'done').length;
    const inProgress = tasks.filter(task => task.status === 'in-progress').length;
    const todo = tasks.filter(task => task.status === 'todo').length;
    
    return { total, completed, inProgress, todo };
  };

  const groupSprintsByStatus = () => {
    if (!projectData?.sprints) return { active: [], future: [], completed: [] };
    
    const sprints = Object.values(projectData.sprints);
    
    const grouped = {
      active: sprints.filter(sprint => getSprintStatus(sprint) === 'active'),
      future: sprints.filter(sprint => getSprintStatus(sprint) === 'future'),
      completed: sprints.filter(sprint => getSprintStatus(sprint) === 'completed')
    };
    
    return grouped;
  };

  const { active, future, completed } = groupSprintsByStatus();

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="h-20 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SprintCard = ({ sprint, status }) => {
    const tasks = getSprintTasks(sprint._id);
    const stats = getSprintStats(tasks);
    const progress = getSprintProgress(tasks);

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">{sprint.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-green-100 text-green-800' :
              status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : 'Future'}
            </span>
          </div>
          <div className="flex items-center text-xs text-gray-500 mb-3">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDateRange(sprint.startDate, sprint.endDate)}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {stats.total} tasks
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">{stats.completed} done</span>
              <span className="text-blue-600">{stats.inProgress} in progress</span>
              <span className="text-gray-600">{stats.todo} todo</span>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {status === 'future' && (
            <button
              onClick={() => handleStartSprint(sprint._id)}
              className="w-full bg-blue-600 text-white text-sm py-2 px-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-1" />
              Start Sprint
            </button>
          )}
          
          {status === 'active' && (
            <button
              onClick={() => handleCompleteSprint(sprint._id)}
              className="w-full bg-gray-600 text-white text-sm py-2 px-3 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <Square className="w-4 h-4 mr-1" />
              Complete Sprint
            </button>
          )}
        </div>
      </div>
    );
  };

  const SprintSection = ({ title, sprints, status, icon: Icon, emptyMessage }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center">
          <Icon className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {sprints.length}
          </span>
        </div>
      </div>
      <div className="p-4">
        {sprints.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sprints.map(sprint => (
              <SprintCard key={sprint._id} sprint={sprint} status={status} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sprint Management</h1>
          <p className="text-gray-600">Manage your project sprints and track progress</p>
        </div>

        {Object.values(projectData?.sprints || {}).some(sprint => !sprint.state) && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 text-sm">
                  Some sprints need to be migrated to the new format
                </span>
              </div>
              <button
                onClick={migrateLegacySprints}
                disabled={migrating}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                {migrating ? 'Migrating...' : 'Migrate Sprints'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SprintSection
            title="Future Sprints"
            sprints={future}
            status="future"
            icon={Clock}
            emptyMessage="No future sprints planned."
          />
          
          <SprintSection
            title="Active Sprint"
            sprints={active}
            status="active"
            icon={Play}
            emptyMessage="No active sprint. Start a future sprint to begin work."
          />
          
          <SprintSection
            title="Completed Sprints"
            sprints={completed}
            status="completed"
            icon={CheckCircle}
            emptyMessage="No completed sprints yet."
          />
        </div>
      </div>
    </div>
  );
};

export default SprintBoard; 