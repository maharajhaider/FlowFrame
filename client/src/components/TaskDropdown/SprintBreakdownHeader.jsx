import React from "react";
import { ListEnd, ListCollapse, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditTaskModal, {
  ModalMode,
  ModalType,
} from "@/components/TaskDropdown/EditTaskModal.jsx";
import { addTask } from "@/redux/slices/aiEpicSlice.js";
import { toast } from "@/hooks/use-toast.jsx";
import { useDispatch } from "react-redux";

const SprintBreakdownHeader = ({
  selectedApprovals,
  onExpandAll,
  onCollapseAll,
  onApproveSelected,
  onApproveAll,
  onAutoAssignAll,
  openModal,
  autoAssignAllLoading,
}) => {
  const dispatch = useDispatch();

  const handleTaskCreate = () => {
    openModal(EditTaskModal, {
      type: ModalType.TASK,
      mode: ModalMode.CREATE,
      onSave: (itemId, task) => {
        dispatch(addTask(task));
        toast({
          title: "Feature updated",
          description: `Task has been created successfully.`,
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
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Sprint Breakdown
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExpandAll}
            className="flex items-center gap-2"
          >
            <ListEnd size={16} />
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="flex items-center gap-2"
          >
            <ListCollapse size={16} />
            Collapse All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleTaskCreate}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Create New Task
        </Button>
        <Button
          variant="outline"
          onClick={onAutoAssignAll}
          disabled={autoAssignAllLoading}
          className="flex items-center gap-2"
        >
          {autoAssignAllLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <UserPlus size={16} />
          )}
          {autoAssignAllLoading ? "Assigning..." : "Auto Assign All"}
        </Button>
        <Button
          variant="outline"
          onClick={onApproveSelected}
          disabled={selectedApprovals.tasks.size === 0}
        >
          Approve Selected ({selectedApprovals.tasks.size || 0})
        </Button>
        <Button
          onClick={onApproveAll}
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          Approve All
        </Button>
      </div>
    </div>
  );
};

export default SprintBreakdownHeader;
