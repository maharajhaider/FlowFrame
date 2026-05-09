import React from "react";
import { UserPlus } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { canCurrentUserEdit } from "../../utils/permissions";

const TaskCardBoard = ({
  task,
  features = [],
  onDragStart,
  onClick,
  onAutoAssign,
  isUpdating = false,
}) => {
  const navigate = useNavigate();

  const assigneeName =
    task.assignee?.name || task.assignee?.email || task.assignee;
  
  const getFeatureName = () => {
    if (!task.featureId) return null;
    const feature = features.find((f) => f._id === task.featureId);
    return feature?.title || "Unknown Feature";
  };

  const featureName = getFeatureName();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/task/${task._id || task.id}`);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    if (canCurrentUserEdit()) {
      onDragStart();
    }
  };

  const getTaskId = () => {
    const taskId = task.id || task._id;
    console.log(taskId);
    if (!taskId) return "N/A";
    return typeof taskId === "string"
      ? taskId.slice(-8)
      : taskId.toString().slice(-8);
  };

  return (
    <div
      draggable={!isUpdating && canCurrentUserEdit()}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer group ${
        isUpdating ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {isUpdating && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
        />
        {featureName && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {featureName}
          </span>
        )}
      </div>

      <h4 className="font-medium mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-sm mb-3 text-gray-600 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>#{getTaskId()}</span>
        <div className="flex items-center gap-2">
          {assigneeName ? (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {assigneeName.charAt(0).toUpperCase()}
            </span>
          </div>
          ) : (
            onAutoAssign && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoAssign(task);
                }}
                className="w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors"
                title="Auto assign task"
              >
                <UserPlus size={12} className="text-blue-600" />
              </button>
            )
        )}
        </div>
      </div>
    </div>
  );
};

export default TaskCardBoard;
