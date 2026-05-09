import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchProjectData, updateTaskStatus } from '../redux/slices/projectSlice';
import { fetchUsers } from '../redux/slices/userSlice';
import { canCurrentUserEdit } from '../utils/permissions';
import { interactionService } from '../services/interactionService';

const Backlog = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projectState = useSelector((state) => state.project) || {};
  const { data, loading, error } = projectState;
  const { tasks, features, sprints } = data || {};
  
  const userState = useSelector((state) => state.users) || {};
  const { data: users, loading: usersLoading, error: usersError } = userState;
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // State for filters and search
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    feature: 'all',
    sprint: 'all',
    searchText: ''
  });

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'priority',
    direction: 'desc'
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(20);

  useEffect(() => {
    dispatch(fetchProjectData());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Convert object data to arrays for easier handling
  const tasksArray = tasks ? Object.values(tasks) : [];
  const featuresArray = features ? Object.values(features) : [];
  const sprintsArray = sprints ? Object.values(sprints) : [];
  const usersArray = users || [];

  // Get filtered and sorted tasks
  const getFilteredTasks = () => {
    let filtered = [...tasksArray];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    // Filter by assignee
    if (filters.assignee !== 'all') {
      if (filters.assignee === '') {
        // Filter for unassigned tasks (null, undefined, empty string, or empty object)
        filtered = filtered.filter((task) => !task.assignee || task.assignee === "" || (typeof task.assignee === 'object' && !task.assignee._id));
      } else {
        // Filter for specific assignee - handle both populated object and string ID
        filtered = filtered.filter((task) => {
          if (!task.assignee) return false;
          // If assignee is a populated object, compare _id
          if (typeof task.assignee === 'object' && task.assignee._id) {
            return task.assignee._id === filters.assignee;
          }
          // If assignee is a string ID, compare directly
          return task.assignee === filters.assignee;
        });
      }
    }

    // Filter by feature
    if (filters.feature !== 'all') {
      filtered = filtered.filter((task) => task.featureId === filters.feature);
    }

    // Filter by sprint
    if (filters.sprint !== 'all') {
      if (filters.sprint === 'backlog') {
        filtered = filtered.filter((task) => !task.sprintId);
      } else {
        filtered = filtered.filter((task) => task.sprintId === filters.sprint);
      }
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter((task) => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task._id.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Sort tasks
  const sortTasks = (tasks) => {
    return tasks.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle priority sorting
      if (sortConfig.key === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority] || 0;
        bValue = priorityOrder[b.priority] || 0;
      }

      // Handle assignee sorting
      if (sortConfig.key === 'assignee') {
        const getAssigneeName = (task) => {
          if (!task.assignee) return 'Unassigned';
          // If assignee is a populated object, use its name
          if (typeof task.assignee === 'object' && task.assignee.name) {
            return task.assignee.name;
          }
          // If assignee is a string ID, find the user
          if (typeof task.assignee === 'string') {
            return usersArray.find(u => u._id === task.assignee)?.name || 'Unknown User';
          }
          return 'Unassigned';
        };
        aValue = getAssigneeName(a);
        bValue = getAssigneeName(b);
      }

      // Handle feature sorting
      if (sortConfig.key === 'feature') {
        const featureA = featuresArray.find(f => f._id === a.featureId)?.title || 'No Feature';
        const featureB = featuresArray.find(f => f._id === b.featureId)?.title || 'No Feature';
        aValue = featureA;
        bValue = featureB;
      }

      // Handle sprint sorting
      if (sortConfig.key === 'sprint') {
        const sprintA = a.sprintId ? sprintsArray.find(s => s._id === a.sprintId)?.title || 'Unknown Sprint' : 'Backlog';
        const sprintB = b.sprintId ? sprintsArray.find(s => s._id === b.sprintId)?.title || 'Unknown Sprint' : 'Backlog';
        aValue = sprintA;
        bValue = sprintB;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredTasks = sortTasks(getFilteredTasks());

  // Pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      assignee: 'all',
      feature: 'all',
      sprint: 'all',
      searchText: ''
    });
    setCurrentPage(1);
  };

  // Handle status change
  const handleStatusChange = async (taskId, newStatus) => {
    if (!canCurrentUserEdit()) {
      return; // Prevent status change for non-editors
    }
    try {
      await dispatch(updateTaskStatus({ id: taskId, status: newStatus })).unwrap();
      
      try {
        await interactionService.recordInteraction(taskId, 'status_changed', {
          changeType: 'status_update'
        }, null, newStatus);
      } catch (error) {
        console.error('Failed to record status change interaction:', error);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Backlog</h1>
          <p className="text-gray-600">Manage and organize all your project tasks</p>

        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            {(filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all' || 
              filters.feature !== 'all' || filters.sprint !== 'all' || filters.searchText) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Assignee Filter */}
            <div className="relative">
              <select
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Assignees ({usersArray.length} users)</option>
                <option value="">Unassigned</option>
                {usersArray.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name || 'Unnamed User'}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Feature Filter */}
            <div className="relative">
              <select
                value={filters.feature}
                onChange={(e) => handleFilterChange('feature', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Features</option>
                {featuresArray.map((feature) => (
                  <option key={feature._id} value={feature._id}>
                    {feature.title}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Sprint Filter */}
            <div className="relative">
              <select
                value={filters.sprint}
                onChange={(e) => handleFilterChange('sprint', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Sprints</option>
                <option value="backlog">Backlog</option>
                {sprintsArray.map((sprint) => (
                  <option key={sprint._id} value={sprint._id}>
                    {sprint.title}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all' || 
            filters.feature !== 'all' || filters.sprint !== 'all' || filters.searchText) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {filters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Status: {filters.status}
                    <button
                      onClick={() => handleFilterChange('status', 'all')}
                      className="ml-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.priority !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Priority: {filters.priority}
                    <button
                      onClick={() => handleFilterChange('priority', 'all')}
                      className="ml-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.assignee !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Assignee: {filters.assignee === '' ? 'Unassigned' : usersArray.find(u => u._id === filters.assignee)?.name || 'Unknown User'}
                    <button
                      onClick={() => handleFilterChange('assignee', 'all')}
                      className="ml-1 text-green-500 hover:text-green-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.feature !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Feature: {featuresArray.find(f => f._id === filters.feature)?.title}
                    <button
                      onClick={() => handleFilterChange('feature', 'all')}
                      className="ml-1 text-purple-500 hover:text-purple-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.sprint !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    Sprint: {filters.sprint === 'backlog' ? 'Backlog' : sprintsArray.find(s => s._id === filters.sprint)?.title}
                    <button
                      onClick={() => handleFilterChange('sprint', 'all')}
                      className="ml-1 text-amber-500 hover:text-amber-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.searchText && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-200">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    Search: "{filters.searchText}"
                    <button
                      onClick={() => handleFilterChange('searchText', '')}
                      className="ml-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstTask + 1}-{Math.min(indexOfLastTask, filteredTasks.length)} of {filteredTasks.length} tasks
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('_id')}>
                    <div className="flex items-center gap-2">
                      ID
                      {sortConfig.key === '_id' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-2">
                      Title
                      {sortConfig.key === 'title' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-2">
                      Priority
                      {sortConfig.key === 'priority' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status
                      {sortConfig.key === 'status' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('assignee')}>
                    <div className="flex items-center gap-2">
                      Assignee
                      {sortConfig.key === 'assignee' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('feature')}>
                    <div className="flex items-center gap-2">
                      Feature
                      {sortConfig.key === 'feature' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('sprint')}>
                    <div className="flex items-center gap-2">
                      Sprint
                      {sortConfig.key === 'sprint' && (
                        <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTasks.map((task) => (
                  <tr 
                    key={task._id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/task/${task._id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <button 
                        className="text-blue-600 hover:text-blue-900 transition-colors font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/task/${task._id}`);
                        }}
                      >
                        {task._id.slice(-8)}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canCurrentUserEdit() ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${getStatusColor(task.status)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : 'Done'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        if (!task.assignee) return 'Unassigned';
                        // If assignee is a populated object, use its name
                        if (typeof task.assignee === 'object' && task.assignee.name) {
                          return task.assignee.name;
                        }
                        // If assignee is a string ID, find the user
                        if (typeof task.assignee === 'string') {
                          return usersArray.find(u => u._id === task.assignee)?.name || 'Unknown User';
                        }
                        return 'Unassigned';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.featureId ? featuresArray.find(f => f._id === task.featureId)?.title : 'No Feature'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.sprintId ? sprintsArray.find(s => s._id === task.sprintId)?.title : 'Backlog'}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {currentTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4 inline-block">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filteredTasks.length === 0 ? 'No tasks found' : 'No tasks on this page'}
              </h3>
              <p className="text-gray-600">
                {filteredTasks.length === 0 ? 'Try adjusting your filters or create new tasks.' : 'Try navigating to a different page.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Backlog; 