import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Clock, Edit3 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import TaskCard from './TaskCard';
import { useDispatch, useSelector } from 'react-redux';
import EditTaskModal, {
  ModalMode,
  ModalType,
} from '@/components/TaskDropdown/EditTaskModal.jsx';
import {
  deleteFeatureById,
  updateFeatureById,
} from '@/redux/slices/aiEpicSlice.js';
import { toast } from '@/hooks/use-toast.jsx';

const FeatureCard = ({
  sprintId,
  featureId,
  expandedFeatures,
  selectedApprovals,
  onToggleExpansion,
  onApprovalChange,
  onAutoAssignTask,
  getTicketNumber,
  getPriorityColor,
  openModal,
  autoAssignTaskLoading,
  taskAssignmentDetails,
  onShowAssignmentDetails,
}) => {
  const feature = useSelector(state => state.aiEpic.data.features[featureId]);
  const tasks = useSelector(state => state.aiEpic.data.tasks);
  const currentFeatureSprintTasks = feature.taskIds
    .map(taskId => tasks[taskId])
    .filter(task => task.sprintId === sprintId);

  let estimatedFeatureHours = 0;

  currentFeatureSprintTasks.forEach(task => {
    estimatedFeatureHours += task.estimatedHours;
  });

  const dispatch = useDispatch();

  const onFeatureEdit = feature => {
    openModal(EditTaskModal, {
      item: feature,
      type: ModalType.FEATURE,
      mode: ModalMode.EDIT,
      onSave: (updateItemId, updatedItem) => {
        dispatch(updateFeatureById({ id: updateItemId, updates: updatedItem }));
        toast({
          title: 'Feature updated',
          description: `Feature "${updatedItem.title}" has been updated successfully.`,
        });
      },
      onDelete: itemId => {
        dispatch(deleteFeatureById({ featureId: itemId, sprintId }));
        toast({
          title: 'Feature deleted',
          description: `Feature has been deleted.`,
          variant: 'destructive',
        });
      },
      selectedProject: {
        id: 'project-1',
        name: 'Current Project',
        color: 'bg-blue-500',
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="p-6 rounded-xl border-l-4 border border-border  hover:shadow-md transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Checkbox
              checked={selectedApprovals.features.has(feature.id)}
              onCheckedChange={checked => onApprovalChange(feature.id, checked, 'feature')}
            />
          </div>

          <button
            onClick={() => onToggleExpansion(feature.id)}
            className="mt-1 hover:bg-gray-100 rounded-lg p-2 transition-colors"
          >
            {expandedFeatures.has(feature.id) ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold">
                    {feature.title}
                  </h4>
                  {feature.isApproved && (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      APPROVED
                    </span>
                  )}
                </div>
                {feature.description && (
                  <p className="text-base mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1 text-sm">
                    <Clock size={14} />
                    <span>
                      {estimatedFeatureHours}h estimated
                    </span>
                  </span>
                  {feature.assignee && (
                    <span className="text-sm font-medium">
                      Assigned to {feature.assignee}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      feature.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : feature.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    )}
                  >
                    {feature.priority?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFeatureEdit(feature)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit feature"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {expandedFeatures.has(feature.id) && feature.taskIds && (
        <div className="ml-12 space-y-3">
          {currentFeatureSprintTasks.map(task => (
            <TaskCard
              key={task.id}
              taskId={task.id}
              selectedApprovals={selectedApprovals}
              openModal={openModal}
              onApprovalChange={onApprovalChange}
              onAutoAssignTask={onAutoAssignTask}
              getTicketNumber={getTicketNumber}
              autoAssignTaskLoading={autoAssignTaskLoading}
              taskAssignmentDetails={taskAssignmentDetails}
              onShowAssignmentDetails={onShowAssignmentDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureCard;
