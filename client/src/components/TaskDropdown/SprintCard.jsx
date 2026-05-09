import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import TasksFeatureCard from './FeatureCard';
import { useSelector } from 'react-redux';

const SprintCard = ({
  sprintId,
  expandedSprints,
  expandedFeatures,
  selectedApprovals,
  onToggleSprintExpansion,
  onToggleFeatureExpansion,
  onApprovalChange,
  onAutoAssignTask,
  getTicketNumber,
  getPriorityColor,
  openModal,
  autoAssignTaskLoading,
  taskAssignmentDetails,
  onShowAssignmentDetails,
}) => {
  const sprint = useSelector(state => state.aiEpic.data.sprints[sprintId]);
  const features = useSelector(state => state.aiEpic.data.features);

  const sprintFeatures = sprint.featureIds.map(
    featureId => features[featureId]
  );

  return (
    <Collapsible
      open={expandedSprints.has(sprint.id)}
      onOpenChange={() => onToggleSprintExpansion(sprint.id)}
    >
      <div
        className="rounded-xl border border-border"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <CollapsibleTrigger asChild>
          <div className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {expandedSprints.has(sprint.id) ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <div>
                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {sprint.title}
                  </h3>
                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: 'var(--color-textSecondary)' }}
                  >
                    <span>
                      {new Date(sprint.startDate).toLocaleDateString()} -{' '}
                      {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {sprintFeatures.length} features
                </span>
                <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-6 pt-0 space-y-4">
            {sprintFeatures.map(feature => (
              <TasksFeatureCard
                key={feature.id}
                openModal={openModal}
                sprintId={sprintId}
                featureId={feature.id}
                expandedFeatures={expandedFeatures}
                selectedApprovals={selectedApprovals}
                onToggleExpansion={onToggleFeatureExpansion}
                onApprovalChange={onApprovalChange}
                onAutoAssignTask={onAutoAssignTask}
                getTicketNumber={getTicketNumber}
                getPriorityColor={getPriorityColor}
                autoAssignTaskLoading={autoAssignTaskLoading}
                taskAssignmentDetails={taskAssignmentDetails}
                onShowAssignmentDetails={onShowAssignmentDetails}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default SprintCard;
