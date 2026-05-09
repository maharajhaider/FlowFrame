import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Edit3, UserPlus, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useDispatch, useSelector } from "react-redux";
import EditTaskModal, {
  ModalMode,
  ModalType,
} from "@/components/TaskDropdown/EditTaskModal.jsx";
import { deleteTaskById, updateTaskById } from "@/redux/slices/aiEpicSlice.js";
import { toast } from "@/hooks/use-toast.jsx";
import { canCurrentUserEdit } from "../../utils/permissions";

const TaskCard = ({
  taskId,
  selectedApprovals,
  onApprovalChange,
  onAutoAssignTask,
  openModal,
  autoAssignTaskLoading,
  taskAssignmentDetails,
  onShowAssignmentDetails,
}) => {
  const task = useSelector((state) => state.aiEpic.data.tasks[taskId]);
  const users = useSelector((state) => state.users.data);
  const dispatch = useDispatch();

  const assignee = users.find((user) => user._id === task.assignee);
  const onTaskEdit = (task) => {
    openModal(EditTaskModal, {
      item: task,
      type: ModalType.TASK,
      mode: ModalMode.EDIT,
      onSave: (updateItemId, updatedItem) => {
        dispatch(updateTaskById({ id: updateItemId, updates: updatedItem }));
        toast({
          title: "Task updated",
          description: `Task "${updatedItem.title}" has been updated successfully.`,
        });
      },
      onDelete: (itemId) => {
        dispatch(deleteTaskById(itemId));
        toast({
          title: "Task deleted",
          description: `Task has been deleted.`,
          variant: "destructive",
        });
      },
      selectedProject: {
        id: "project-1",
        name: "Current Project",
        color: "bg-blue-500",
      },
    });
  };

  return (
    <div
      className="p-4 rounded-lg border border-border/50 hover:shadow-sm transition-all duration-200"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Checkbox
            checked={selectedApprovals.tasks.has(task.id)}
            onCheckedChange={(checked) =>
              onApprovalChange(task.id, checked, "task")
            }
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h5
                  className="font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  {task.title}
                </h5>
                {task.isApproved && (
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                    APPROVED
                  </span>
                )}
              </div>
              {task.description && (
                <p
                  className="text-sm mb-2 leading-relaxed"
                  style={{ color: "var(--color-textSecondary)" }}
                >
                  {task.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <span style={{ color: "var(--color-text)" }}>
                    {task.estimatedHours}h
                  </span>
                </span>
                {assignee && (
                  <div className="flex items-center gap-1">
                    <span
                      className="font-medium"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {assignee.name || assignee.email}
                    </span>
                    {taskAssignmentDetails && taskAssignmentDetails[taskId] && (
                      <button
                        onClick={() =>
                          onShowAssignmentDetails(taskAssignmentDetails[taskId])
                        }
                        className="p-0.5 hover:bg-primary/10 rounded transition-colors group relative"
                        title="Click to see assignment details"
                      >
                        <Info
                          size={12}
                          style={{ color: "var(--color-primary)" }}
                        />
                        <div className="absolute left-0 top-6 w-48 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          Click to see details about the auto assignment for
                          this task
                        </div>
                      </button>
                    )}
                  </div>
                )}
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {task.priority?.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {canCurrentUserEdit() && (
                <button
                  onClick={() => onTaskEdit(task)}
                  className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                  title="Edit task"
                >
                  <Edit3 size={14} style={{ color: "var(--color-primary)" }} />
                </button>
              )}

              {!assignee && canCurrentUserEdit() && (
                <button
                  onClick={() => onAutoAssignTask(task.id)}
                  disabled={autoAssignTaskLoading[task.id]}
                  className="p-1.5 hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto assign"
                >
                  {autoAssignTaskLoading[task.id] ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                  ) : (
                    <UserPlus
                      size={14}
                      style={{ color: "var(--color-primary)" }}
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
