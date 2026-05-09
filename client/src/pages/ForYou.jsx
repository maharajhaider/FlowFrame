import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProjectData } from "../redux/slices/projectSlice";
import { fetchUsers } from "../redux/slices/userSlice";
import { 
  Clock, 
  Eye, 
  UserCheck, 
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPriorityColor, getTicketNumber } from "../data/staticData";
import { interactionService } from "../services/interactionService";

const ForYou = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: projectData, loading, error } = useSelector((state) => state.project);
  const users = useSelector((state) => state.users.data);
  const userLoading = useSelector((state) => state.users.loading);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workedOnTasks, setWorkedOnTasks] = useState([]);
  const [viewedTasks, setViewedTasks] = useState([]);
  const [interactionCounts, setInteractionCounts] = useState({ workedOn: 0, viewed: 0 });
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  useEffect(() => {
    dispatch(fetchProjectData());
    dispatch(fetchUsers());
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
    }
  }, [dispatch]);

  useEffect(() => {
    const loadInteractionData = async () => {
      if (!currentUser) return;
      
      setLoadingInteractions(true);
      try {
        const [workedOnData, viewedData, countsData] = await Promise.all([
          interactionService.getWorkedOnTasks(),
          interactionService.getViewedTasks(),
          interactionService.getInteractionCounts()
        ]);
        
        setWorkedOnTasks(workedOnData);
        setViewedTasks(viewedData);
        setInteractionCounts(countsData);
      } catch (error) {
        console.error('Error loading interaction data:', error);
      } finally {
        setLoadingInteractions(false);
      }
    };

    loadInteractionData();
  }, [currentUser]);

  if (loading || userLoading || loadingInteractions) {
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

  const getFilteredTasks = () => {
    if (!currentUser) return [];

    let filteredTasks = tasks;

    switch (activeTab) {
      case "assigned":
        filteredTasks = tasks.filter(task => 
          task.assignee && task.assignee._id === currentUser._id
        );
        break;
      case "worked":
        const workedOnTaskIds = workedOnTasks.map(item => item.taskId);
        filteredTasks = tasks.filter(task => 
          workedOnTaskIds.includes(task._id)
        ).sort((a, b) => {
          const aItem = workedOnTasks.find(item => item.taskId === a._id);
          const bItem = workedOnTasks.find(item => item.taskId === b._id);
          if (!aItem || !bItem) return 0;
          return new Date(bItem.lastInteraction.createdAt) - new Date(aItem.lastInteraction.createdAt);
        });
        break;
      case "viewed":
        const viewedTaskIds = viewedTasks.map(item => item.taskId._id);
        filteredTasks = tasks.filter(task => 
          viewedTaskIds.includes(task._id)
        ).sort((a, b) => {
          const aHistory = viewedTasks.find(item => item.taskId._id === a._id);
          const bHistory = viewedTasks.find(item => item.taskId._id === b._id);
          if (!aHistory || !bHistory) return 0;
          return new Date(bHistory.createdAt) - new Date(aHistory.createdAt);
        });
        break;
      default:
        break;
    }

    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }

    return filteredTasks;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "todo":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "done":
        return "Done";
      case "in-progress":
        return "In Progress";
      case "todo":
        return "To Do";
      default:
        return status;
    }
  };

  const getFeatureName = (featureId) => {
    const feature = features.find(f => f._id === featureId);
    return feature ? feature.title : "Unknown Feature";
  };

  const getSprintName = (sprintId) => {
    const sprint = sprints.find(s => s._id === sprintId);
    return sprint ? sprint.title : "Unknown Sprint";
  };

  const filteredTasks = getFilteredTasks();

  const handleClearHistory = async () => {
    try {
      await interactionService.clearInteractions('viewed');
      setViewedTasks([]);
      setInteractionCounts(prev => ({ ...prev, viewed: 0 }));
    } catch (error) {
      console.error('Error clearing view history:', error);
    }
  };

  const handleClearWorkHistory = async () => {
    try {
      await interactionService.clearInteractions();
      setWorkedOnTasks([]);
      setInteractionCounts(prev => ({ ...prev, workedOn: 0 }));
    } catch (error) {
      console.error('Error clearing work history:', error);
    }
  };

  const tabs = [
    {
      id: "assigned",
      name: "Assigned to Me",
      icon: UserCheck,
      count: tasks.filter(task => 
        task.assignee && task.assignee._id === currentUser?._id
      ).length
    },
    {
      id: "worked",
      name: "Worked On",
      icon: TrendingUp,
      count: interactionCounts.workedOn
    },
    {
      id: "viewed",
      name: "Recently Viewed",
      icon: Eye,
      count: interactionCounts.viewed
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">For You</h1>
        <p className="text-gray-600">
          Your personalized view of tasks and activities
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.name}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          {activeTab === "viewed" && viewedTasks.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear History
            </button>
          )}
          {activeTab === "worked" && workedOnTasks.length > 0 && (
            <button
              onClick={handleClearWorkHistory}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear Work History
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {activeTab === "assigned" && <UserCheck className="w-8 h-8 text-gray-400" />}
              {activeTab === "worked" && <TrendingUp className="w-8 h-8 text-gray-400" />}
              {activeTab === "viewed" && <Eye className="w-8 h-8 text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-500">
              {activeTab === "assigned" && "You don't have any tasks assigned to you yet."}
              {activeTab === "worked" && "You haven't worked on any tasks yet."}
              {activeTab === "viewed" && "No recently viewed tasks."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => navigate(`/task/${task._id}`)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {getTicketNumber(task._id)}
                    </span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(task.status)}
                      <span className="text-sm text-gray-600">
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {getFeatureName(task.featureId)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getSprintName(task.sprintId)}
                    </div>
                    {task.estimatedHours > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {task.estimatedHours}h
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {task.assignee.name ? task.assignee.name.charAt(0).toUpperCase() : "U"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {task.assignee.name || task.assignee.email}
                      </span>
                    </div>
                  )}
                  
                  {activeTab === "viewed" && task._id && (() => {
                    const historyItem = viewedTasks.find(item => item.taskId._id === task._id);
                    return historyItem ? (
                      <span className="text-xs text-gray-400">
                        Viewed {new Date(historyItem.createdAt).toLocaleDateString()}
                      </span>
                    ) : null;
                  })()}
                  {activeTab === "worked" && task._id && (() => {
                    const workedItem = workedOnTasks.find(item => item.taskId === task._id);
                    return workedItem ? (
                      <span className="text-xs text-gray-400">
                        {workedItem.lastInteraction.interactionType === 'task_updated' && 'Updated'}
                        {workedItem.lastInteraction.interactionType === 'comment_added' && 'Commented'}
                        {workedItem.lastInteraction.interactionType === 'file_uploaded' && 'Uploaded files'}
                        {workedItem.lastInteraction.interactionType === 'status_changed' && 'Status changed'}
                        {' '}{new Date(workedItem.lastInteraction.createdAt).toLocaleDateString()}
                      </span>
                    ) : null;
                  })()}
                  {activeTab !== "viewed" && activeTab !== "worked" && task.updatedAt && (
                    <span className="text-xs text-gray-400">
                      Updated {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForYou; 