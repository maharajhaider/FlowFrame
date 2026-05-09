import React from "react";
import SprintBreakdownHeader from "./SprintBreakdownHeader";
import SprintCard from "./SprintCard";
import { useSelector } from "react-redux";

const SprintBreakdown = ({
  expandedSprints,
  expandedFeatures,
  selectedApprovals,
  onToggleSprintExpansion,
  onToggleFeatureExpansion,
  onApprovalChange,
  onAutoAssignTask,
  onAutoAssignAll,
  onExpandAll,
  onCollapseAll,
  onApproveSelected,
  onApproveAll,
  getTicketNumber,
  getPriorityColor,
  openModal,
  autoAssignAllLoading,
  autoAssignTaskLoading,
  taskAssignmentDetails,
  onShowAssignmentDetails,
}) => {
  const { sprints } = useSelector((state) => state.aiEpic.data);

  return (
    <>
      <SprintBreakdownHeader
        selectedApprovals={selectedApprovals}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onApproveSelected={onApproveSelected}
        onApproveAll={onApproveAll}
        onAutoAssignAll={onAutoAssignAll}
        openModal={openModal}
        autoAssignAllLoading={autoAssignAllLoading}
      />

      {/* Sprint List */}
      <div className="space-y-6">
        {Object.values(sprints).map((sprint) => {
          return (
            <SprintCard
              key={sprint.id}
              sprintId={sprint.id}
              expandedSprints={expandedSprints}
              expandedFeatures={expandedFeatures}
              selectedApprovals={selectedApprovals}
              onToggleSprintExpansion={onToggleSprintExpansion}
              onToggleFeatureExpansion={onToggleFeatureExpansion}
              openModal={openModal}
              onApprovalChange={onApprovalChange}
              onAutoAssignTask={onAutoAssignTask}
              getTicketNumber={getTicketNumber}
              getPriorityColor={getPriorityColor}
              autoAssignTaskLoading={autoAssignTaskLoading}
              taskAssignmentDetails={taskAssignmentDetails}
              onShowAssignmentDetails={onShowAssignmentDetails}
            />
          );
        })}
      </div>
    </>
  );
};

export default SprintBreakdown;
