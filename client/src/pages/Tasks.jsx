import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import SprintBreakdown from "@/components/TaskDropdown/SprintBreakdown";
import { useDispatch, useSelector } from "react-redux";
import { getPriorityColor, getTicketNumber } from "../data/staticData";
import { Portal } from "@radix-ui/react-portal";
import { createProject } from "@/redux/slices/projectSlice.js";
import { fetchUsers } from "@/redux/slices/userSlice.js";
import { useNavigate } from "react-router-dom";
import axios from "@/api/axios.js";
import { updateTaskById } from "@/redux/slices/aiEpicSlice.js";
import AssignmentResultModal from "@/components/Assignment/AssignmentResultModal.jsx";

const Tasks = () => {
  const { sprints, features, tasks } = useSelector(
    (state) => state.aiEpic.data
  );

  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const offset = 80; // height of your fixed navbar
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const [expandedFeatures, setExpandedFeatures] = useState(
    new Set(Object.keys(features))
  );
  const [expandedSprints, setExpandedSprints] = useState(
    new Set(Object.keys(sprints))
  );

  const [ModalComponent, setModalComponent] = useState(null);
  const [modalProps, setModalProps] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (Component, props = {}) => {
    setModalComponent(() => Component);
    setModalProps(props);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalComponent(null);
    setModalProps({});
  };

  const [selectedApprovals, setSelectedApprovals] = useState({
    sprints: new Set(),
    features: new Set(),
    tasks: new Set(),
  });

  const [assignmentResult, setAssignmentResult] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [autoAssignAllLoading, setAutoAssignAllLoading] = useState(false);
  const [autoAssignTaskLoading, setAutoAssignTaskLoading] = useState({});
  const [taskAssignmentDetails, setTaskAssignmentDetails] = useState({});

  const { toast } = useToast();

  const handleShowAssignmentDetails = (assignmentDetails) => {
    setAssignmentResult(assignmentDetails);
    setShowAssignmentModal(true);
  };

  const toggleFeatureExpansion = (featureId) => {
    const updated = new Set(expandedFeatures);
    updated.has(featureId) ? updated.delete(featureId) : updated.add(featureId);
    setExpandedFeatures(updated);
  };

  const toggleSprintExpansion = (sprintId) => {
    const updated = new Set(expandedSprints);
    updated.has(sprintId) ? updated.delete(sprintId) : updated.add(sprintId);
    setExpandedSprints(updated);
  };

  const collapseAll = () => {
    setExpandedFeatures(new Set());
    setExpandedSprints(new Set());
  };

  const expandAll = () => {
    setExpandedFeatures(new Set(Object.keys(features)));
    setExpandedSprints(new Set(Object.keys(sprints)));
  };

  const autoAssignTask = async (taskId) => {
    try {
      // Set loading state for this specific task
      setAutoAssignTaskLoading((prev) => ({ ...prev, [taskId]: true }));

      const task = tasks[taskId];
      if (!task) {
        toast({
          title: "Error",
          description: "Task not found.",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      const loadingToast = toast({
        title: "Assigning task...",
        description: `Finding the best developer for "${task.title}"`,
      });

      const requestData = {
        auto: true,
        taskData: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          assignee: task.assignee,
          status: task.status,
          featureId: task.featureId,
          sprintId: task.sprintId,
        },
      };

      // Call the ML assignment API with task data for AI-generated tasks
      const response = await axios.post(
        `/api/tasks/${taskId}/assign`,
        requestData
      );

      if (response.data.success) {
        const { assignment, task: updatedTask } = response.data;

        // Update the task in aiEpic state with the new assignee
        dispatch(
          updateTaskById({
            id: taskId,
            updates: {
              assignee: assignment.userId,
            },
          })
        );

        // Store assignment details for the info icon
        const assignmentDetails = {
          task: task,
          assignment: assignment,
          alternatives: response.data.alternatives || [],
          reasoning: response.data.assignment?.reasoning,
        };

        setTaskAssignmentDetails((prev) => ({
          ...prev,
          [taskId]: assignmentDetails,
        }));

        // Show detailed assignment result modal
        setAssignmentResult(assignmentDetails);
        setShowAssignmentModal(true);

        // Also show success toast
        toast({
          title: "Task auto-assigned successfully! 🎯",
          description: `"${task.title}" assigned to ${assignment.userName} (confidence: ${Math.round(assignment.confidence * 100)}%)`,
        });
      } else {
        toast({
          title: "Assignment failed",
          description:
            response.data.message || "Unable to assign task automatically",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Auto-assignment error:", error);

      toast({
        title: "Assignment error",
        description:
          error.response?.data?.message ||
          `Failed to assign task. Status: ${error.response?.status || "unknown"}`,
        variant: "destructive",
      });
    } finally {
      // Clear loading state for this task
      setAutoAssignTaskLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const autoAssignAllUnassigned = async () => {
    try {
      // Set loading state for auto assign all
      setAutoAssignAllLoading(true);

      // Find all unassigned tasks
      const unassignedTasks = Object.values(tasks).filter(
        (task) => !task.assignee
      );

      if (unassignedTasks.length === 0) {
        toast({
          title: "No unassigned tasks",
          description: "All tasks are already assigned.",
        });
        return;
      }

      // Show progress toast
      toast({
        title: "Auto-assigning all tasks...",
        description: `Processing ${unassignedTasks.length} unassigned tasks`,
      });

      let successCount = 0;
      let errorCount = 0;

      // Process tasks sequentially to avoid overwhelming the server
      for (const task of unassignedTasks) {
        try {
          const response = await axios.post(`/api/tasks/${task.id}/assign`, {
            auto: true,
            taskData: {
              title: task.title,
              description: task.description,
              priority: task.priority,
              estimatedHours: task.estimatedHours,
              assignee: task.assignee,
              status: task.status,
              featureId: task.featureId,
              sprintId: task.sprintId,
            },
          });

          if (response.data.success) {
            const { assignment } = response.data;
            dispatch(
              updateTaskById({
                id: task.id,
                updates: {
                  assignee: assignment.userId,
                },
              })
            );
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to assign task ${task.id}:`, error);
          errorCount++;
        }

        // Small delay to prevent server overload
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Show final result
      if (successCount > 0) {
        toast({
          title: `Auto-assignment complete! 🎯`,
          description: `Successfully assigned ${successCount} task${successCount !== 1 ? "s" : ""}${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        });
      } else {
        toast({
          title: "Assignment failed",
          description: "Unable to assign any tasks automatically",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Batch assignment error:", error);
      toast({
        title: "Batch assignment error",
        description: "Failed to process batch assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state for auto assign all
      setAutoAssignAllLoading(false);
    }
  };

  const handleApprovalChange = (id, checked, type) => {
    const updated = {
      sprints: new Set(selectedApprovals.sprints),
      features: new Set(selectedApprovals.features),
      tasks: new Set(selectedApprovals.tasks),
    };

    if (type === "feature") {
      const feature = features[id];
      const sprintIdsFromTasks = new Set();

      feature?.taskIds?.forEach((taskId) => {
        const task = tasks[taskId];
        if (task?.sprintId) sprintIdsFromTasks.add(task.sprintId);
      });

      if (checked) {
        updated.features.add(id);
        feature?.taskIds?.forEach((taskId) => updated.tasks.add(taskId));
        sprintIdsFromTasks.forEach((sid) => updated.sprints.add(sid));
      } else {
        updated.features.delete(id);
        feature?.taskIds?.forEach((taskId) => updated.tasks.delete(taskId));
        sprintIdsFromTasks.forEach((sid) => {
          const stillHasFeatureInSprint = Object.values(features).some(
            (f) =>
              f.taskIds?.some((tid) => tasks[tid]?.sprintId === sid) &&
              updated.features.has(f.id)
          );
          if (!stillHasFeatureInSprint) updated.sprints.delete(sid);
        });
      }
    } else if (type === "task") {
      const task = tasks[id];
      const sprintId = task?.sprintId;
      const featureId = task?.featureId;

      if (checked) {
        updated.tasks.add(id);
        if (featureId) updated.features.add(featureId);
        if (sprintId) updated.sprints.add(sprintId);
      } else {
        updated.tasks.delete(id);

        const stillHasTaskInFeature = Object.values(tasks).some(
          (t) => t.featureId === featureId && updated.tasks.has(t.id)
        );
        if (!stillHasTaskInFeature) updated.features.delete(featureId);

        const stillHasTaskInSprint = Object.values(tasks).some(
          (t) => t.sprintId === sprintId && updated.tasks.has(t.id)
        );
        if (!stillHasTaskInSprint) updated.sprints.delete(sprintId);
      }
    }

    setSelectedApprovals(updated);
  };

  const handleApproveAll = async () => {
    const updated = {
      sprints: new Set(),
      features: new Set(),
      tasks: new Set(),
    };

    Object.entries(features).forEach(([fid, f]) => {
      updated.features.add(fid);
      f.taskIds?.forEach((tid) => {
        updated.tasks.add(tid);
        const sprintId = tasks[tid]?.sprintId;
        if (sprintId) updated.sprints.add(sprintId);
      });
    });

    await dispatch(createProject(updated)).unwrap();
    navigate("/sprints");

    toast({
      title: "All features approved",
      description: "All features and tasks approved.",
    });
  };

  const handleApproveSelected = async () => {
    if (selectedApprovals.tasks.size === 0) {
      toast({
        title: "No tasks selected",
        description: "Select items to approve.",
        variant: "destructive",
      });
      return;
    }
    await dispatch(createProject(selectedApprovals)).unwrap();
    navigate("/sprints");

    toast({
      title: "Selected items approved",
      description: `${selectedApprovals.tasks.size} items approved.`,
    });

    setSelectedApprovals({
      sprints: new Set(),
      features: new Set(),
      tasks: new Set(),
    });
  };

  return (
    <div className="min-h-screen" ref={scrollRef}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {Object.keys(sprints).length > 0 && (
          <>
            <SprintBreakdown
              expandedSprints={expandedSprints}
              expandedFeatures={expandedFeatures}
              openModal={openModal}
              selectedApprovals={selectedApprovals}
              onToggleSprintExpansion={toggleSprintExpansion}
              onToggleFeatureExpansion={toggleFeatureExpansion}
              onApprovalChange={handleApprovalChange}
              onAutoAssignTask={autoAssignTask}
              onAutoAssignAll={autoAssignAllUnassigned}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onApproveSelected={handleApproveSelected}
              onApproveAll={handleApproveAll}
              getTicketNumber={getTicketNumber}
              getPriorityColor={getPriorityColor}
              autoAssignAllLoading={autoAssignAllLoading}
              autoAssignTaskLoading={autoAssignTaskLoading}
              taskAssignmentDetails={taskAssignmentDetails}
              onShowAssignmentDetails={handleShowAssignmentDetails}
            />

            {isModalOpen && ModalComponent && (
              <Portal>
                <ModalComponent
                  {...modalProps}
                  isOpen={isModalOpen}
                  onClose={closeModal}
                />
              </Portal>
            )}

            <AssignmentResultModal
              isOpen={showAssignmentModal}
              onClose={() => setShowAssignmentModal(false)}
              assignmentResult={assignmentResult}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Tasks;
