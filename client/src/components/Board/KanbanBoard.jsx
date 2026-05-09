import React, { useEffect, useState } from "react";
import TaskCardBoard from "./TaskCardBoard";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchProjectData,
  updateTaskStatus,
} from "@/redux/slices/projectSlice.js";
import { fetchUsers } from "@/redux/slices/userSlice.js";
import { canCurrentUserEdit } from "../../utils/permissions";
import { interactionService } from "../../services/interactionService";

const KanbanBoard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sprintsObj = useSelector((state) => state.project.data.sprints);
  const sprintList = Object.values(sprintsObj);
  const tasksObj = useSelector((state) => state.project.data.tasks);
  const tasks = Object.values(tasksObj);
  const featuresObj = useSelector((state) => state.project.data.features);
  const features = Object.values(featuresObj);
  const users = useSelector((state) => state.users.data);
  const loading = useSelector((state) => state.project.loading);
  const error = useSelector((state) => state.project.error);

  // Get active sprint
  const activeSprint = sprintList.find(sprint => sprint.state === 'active');
  
  // Get AI-generated sprints (future sprints)
  const aiGeneratedSprints = sprintList.filter(sprint => sprint.state === 'future');

  const [draggedTask, setDraggedTask] = useState(null);
  const [isProjectManager, setIsProjectManager] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    priority: "all",
    assignee: "all",
    feature: "all",
    searchText: ""
  });

  useEffect(() => {
    dispatch(fetchProjectData());
    dispatch(fetchUsers());
    
    // Check if user is project manager
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setIsProjectManager(user.roles?.includes("project_manager"));
    }
  }, [dispatch]);



  // Apply filters to tasks
  const getFilteredTasks = () => {
    // First, filter tasks to only show active sprint tasks
    let filtered = activeSprint 
      ? tasks.filter((task) => task.sprintId === activeSprint._id)
      : [];

    // Filter by priority
    if (filters.priority !== "all") {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    // Filter by assignee
    if (filters.assignee !== "all") {
      if (filters.assignee === "") {
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
    if (filters.feature !== "all") {
      filtered = filtered.filter((task) => task.featureId === filters.feature);
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter((task) => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();
  
  // Get all tasks (without filters)
  const allTasks = tasks;
  
  // Check if there are any filters applied
  const hasActiveFilters = filters.priority !== "all" || filters.assignee !== "all" || filters.feature !== "all" || filters.searchText;

  const handleCreateSprint = () => {
    navigate("/epic-generator");
  };

  const handleGoToSprintManagement = () => {
    navigate("/sprints");
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!canCurrentUserEdit()) {
      return; // Prevent drag and drop for non-editors
    }
    if (draggedTask) {
      setUpdatingTaskId(draggedTask._id);
      try {
        await dispatch(updateTaskStatus({ id: draggedTask._id, status })).unwrap();
        
        try {
          await interactionService.recordInteraction(draggedTask._id, 'status_changed', {
            changeType: 'drag_drop'
          }, draggedTask.status, status);
        } catch (error) {
          console.error('Failed to record status change interaction:', error);
        }
        
        // Show success feedback
      } catch (error) {
        console.error('Failed to update task status:', error);
      } finally {
        setUpdatingTaskId(null);
        setDraggedTask(null);
      }
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      priority: "all",
      assignee: "all",
      feature: "all",
      searchText: ""
    });
  };

  // Handle empty state when no sprints exist
  if (sprintList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Sprints Available
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          Create your first sprint to start organizing tasks on the Kanban board.
        </p>
        {isProjectManager ? (
          <button 
            onClick={handleCreateSprint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Sprint
          </button>
        ) : (
          <p className="text-sm text-gray-500">
            Contact your project manager to create sprints.
          </p>
        )}
      </div>
    );
  }

  // Handle case when there's no active sprint but AI-generated sprints exist
  if (!activeSprint && aiGeneratedSprints.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-blue-100 rounded-full p-6 mb-4">
          <svg
            className="w-12 h-12 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Active Sprint
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          You have {aiGeneratedSprints.length} sprint{aiGeneratedSprints.length > 1 ? 's' : ''} ready. 
          Please select an active sprint from the Sprint Management page to view tasks on the Kanban board.
        </p>
        <button 
          onClick={handleGoToSprintManagement}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Sprint Management
        </button>
      </div>
    );
  }

  // Handle case when there's no active sprint and no AI-generated sprints
  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Active Sprint
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          There's no active sprint. Create a sprint to start organizing tasks on the Kanban board.
        </p>
        {isProjectManager ? (
          <button 
            onClick={handleCreateSprint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Sprint
          </button>
        ) : (
          <p className="text-sm text-gray-500">
            Contact your project manager to create sprints.
          </p>
        )}
      </div>
    );
  }

  // Only show "no tasks" state if there are no tasks in the active sprint AND no filters are applied
  if (filteredTasks.length === 0 && !hasActiveFilters) {
    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Active Sprint Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active Sprint</h2>
              <p className="text-sm text-gray-600">{activeSprint.title}</p>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Active
            </span>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gray-100 rounded-full p-6 mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Tasks in Active Sprint
          </h3>
          <p className="text-gray-600 mb-4 max-w-md">
            There are no tasks assigned to the current active sprint. Add tasks to this sprint to see them on the Kanban board.
          </p>
          {isProjectManager ? (
            <button 
              onClick={handleCreateSprint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Contact your project manager to create tasks.
            </p>
          )}
        </div>
      </div>
    );
  }

  const columns = [
    {
      id: "todo",
      title: "To Do",
      count: filteredTasks.filter((t) => t.status === "todo").length,
    },
    {
      id: "in-progress",
      title: "In Progress",
      count: filteredTasks.filter((t) => t.status === "in-progress").length,
    },
    {
      id: "done",
      title: "Done",
      count: filteredTasks.filter((t) => t.status === "done").length,
    },
  ];

  const getTasksByStatus = (status) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const handleDragStart = (task) => {
    if (!canCurrentUserEdit()) {
      return; // Prevent drag start for non-editors
    }
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">
            Error: {error}
          </p>
        </div>
      )}

      {/* Active Sprint Header */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Active Sprint</h2>
          <p className="text-xs text-gray-500">{activeSprint.title}</p>
        </div>
      </div>

      {/* Modern Filters */}
      <div className="flex flex-col gap-6">

        {/* Modern Filters */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            </div>
            {(filters.priority !== "all" || filters.assignee !== "all" || filters.feature !== "all" || filters.searchText) && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Filter */}
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
                onChange={(e) => handleFilterChange("searchText", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
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

            <div className="relative">
              <select
                value={filters.assignee}
                onChange={(e) => handleFilterChange("assignee", e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Assignees</option>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
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
                onChange={(e) => handleFilterChange("feature", e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border-0 rounded-xl shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="all">All Features</option>
                {features.map((feature) => (
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
          </div>

          {/* Active Filters Display */}
          {(filters.priority !== "all" || filters.assignee !== "all" || filters.feature !== "all" || filters.searchText) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {filters.priority !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {filters.priority}
                    <button
                      onClick={() => handleFilterChange("priority", "all")}
                      className="ml-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.assignee !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    {filters.assignee === "" ? "Unassigned" : users.find(u => u._id === filters.assignee)?.name}
                    <button
                      onClick={() => handleFilterChange("assignee", "all")}
                      className="ml-1 text-green-500 hover:text-green-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.feature !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    {features.find(f => f._id === filters.feature)?.title}
                    <button
                      onClick={() => handleFilterChange("feature", "all")}
                      className="ml-1 text-purple-500 hover:text-purple-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.searchText && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    "{filters.searchText}"
                    <button
                      onClick={() => handleFilterChange("searchText", "")}
                      className="ml-1 text-amber-500 hover:text-amber-700 transition-colors duration-200"
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
      </div>

      {/* No matching tasks message when filters are applied */}
      {hasActiveFilters && filteredTasks.length === 0 && allTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-800">No tasks match your filters</h3>
          </div>
          <p className="text-amber-700 text-sm mb-4">
            Try adjusting your filters or <button onClick={clearFilters} className="underline font-medium hover:text-amber-800 transition-colors">clear all filters</button> to see all tasks.
          </p>
        </div>
      )}

      <div className="flex gap-6 h-full">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">
                    {column.title}
                  </h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
                    {column.count}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3 min-h-[500px]">
              {getTasksByStatus(column.id).map((task) => (
                <TaskCardBoard
                  key={task._id}
                  task={task}
                  features={features}
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => {}}
                  isUpdating={updatingTaskId === task._id}
                />
              ))}
              {getTasksByStatus(column.id).length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No tasks in this column
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;