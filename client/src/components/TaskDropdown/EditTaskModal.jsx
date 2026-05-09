import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUsers } from '@/redux/slices/userSlice';

export const ModalType = {
  TASK: 'task',
  FEATURE: 'feature',
};

export const ModalMode = {
  CREATE: 'create',
  EDIT: 'edit',
};

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assignee: z.string().optional(), // This will be a User ID
  estimatedHours: z.number().optional(),
  featureId: z.string().optional(),
  sprintId: z.string().optional(),
});

const EditTaskModal = ({
  isOpen,
  onClose,
  item,
  type,
  mode,
  onSave,
  onDelete,
  selectedProject,
}) => {
  const dispatch = useDispatch();
  const [isCreatingNewFeature, setIsCreatingNewFeature] = useState(false);
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [newFeaturePriority, setNewFeaturePriority] = useState('medium');

  const { features, sprints } = useSelector(state => state.aiEpic.data);
  const users = useSelector(state => state.users.data);

  const form = useForm({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (mode === ModalMode.EDIT && item) {
      form.reset({
        title: item.title || '',
        description: item.description || '',
        priority: item.priority || 'medium',
        assignee: item.assignee || 'none',
        estimatedHours: item.estimatedHours || 0,
        featureId: item.featureId || '',
        sprintId: item.sprintId || '',
      });
    } else {
      form.reset();
    }
    setIsCreatingNewFeature(false);
    setNewFeatureTitle('');
    setNewFeatureDescription('');
    setNewFeaturePriority('medium');
  }, [item, form, mode]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchUsers());
    }
  }, [isOpen, dispatch]);

  const onSubmit = data => {
    if (!selectedProject) return;

    const baseProps = {
      id: item ? item.id : uuidv4(),
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignee: data.assignee === 'none' ? undefined : data.assignee,
      estimatedHours: data.estimatedHours,
      projectId: selectedProject.id,
      createdAt: item?.createdAt || new Date().toString(),
    };

    if (type === ModalType.FEATURE) {
      onSave(item?.id, {
        ...baseProps,
        tasks: item?.tasks || [],
      });
    } else {
      const featureId = isCreatingNewFeature ? uuidv4() : data.featureId;
      const featureTitle = isCreatingNewFeature
        ? newFeatureTitle
        : features[data.featureId]?.title;
      const featureDescription = isCreatingNewFeature
        ? newFeatureDescription
        : features[data.featureId]?.description;
      const featurePriority = isCreatingNewFeature
        ? newFeaturePriority
        : features[data.featureId]?.priority;

      const newTask = {
        ...baseProps,
        featureId,
        featureTitle,
        featureDescription,
        featurePriority,
        sprintId: data.sprintId || '',
      };

      onSave(item?.id, newTask);
    }

    onClose();
    form.reset();
  };

  const handleDelete = () => {
    if (item && onDelete) {
      onDelete(item.id);
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  if (!selectedProject) return null;

  const isFeature = type === ModalType.FEATURE;
  const isCreate = mode === ModalMode.CREATE;

  const modalTitle = isFeature
    ? isCreate
      ? 'Create New Feature'
      : 'Edit Feature'
    : isCreate
      ? 'Create New Task'
      : 'Edit Task';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className={cn('w-3 h-3 rounded-full', selectedProject.color)}
            />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Enter ${isFeature ? 'feature' : 'task'} title...`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Enter ${isFeature ? 'feature' : 'task'} description...`}
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {type !== ModalType.FEATURE && (
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Hours..."
                        {...field}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />)}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isFeature && (
              <>
                <FormField
                  control={form.control}
                  name="featureId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Feature</FormLabel>
                      {!isCreatingNewFeature ? (
                        <Select
                          onValueChange={val => {
                            if (val === '__create__') {
                              setIsCreatingNewFeature(true);
                              field.onChange('');
                            } else {
                              setIsCreatingNewFeature(false);
                              field.onChange(val);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select feature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {features &&
                              Object.values(features).map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.title}
                                </SelectItem>
                              ))}
                            <SelectItem value="__create__">
                              ➕ Create New Feature
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <Input
                            placeholder="Enter new feature title..."
                            value={newFeatureTitle}
                            onChange={e => setNewFeatureTitle(e.target.value)}
                            className="mb-2"
                          />
                          <Textarea
                            placeholder="Enter feature description..."
                            value={newFeatureDescription}
                            onChange={e =>
                              setNewFeatureDescription(e.target.value)
                            }
                            className="mb-2"
                          />
                          <Select
                            value={newFeaturePriority}
                            onValueChange={setNewFeaturePriority}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select feature priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isCreate && (
                  <FormField
                    control={form.control}
                    name="sprintId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Sprint</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sprint" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sprints &&
                              Object.values(sprints).map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No assignee</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Footer */}
            <DialogFooter className="flex justify-between">
              {mode === ModalMode.EDIT && item && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} className="mr-2" />
                  {`Delete ${isFeature ? 'Feature' : 'Task'}`}
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {mode === ModalMode.CREATE
                    ? `Create ${isFeature ? 'Feature' : 'Task'}`
                    : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskModal;
