import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axios";

// Async thunk to GET AI-generated epics from /api/llm/generate-sprint
export const fetchAIEpic = createAsyncThunk("aiEpic/fetchAIEpic", async ({ prompt, attachments = [] }) => {
  const response = await axios.post("/api/llm/generate-sprint", { prompt, attachments });
  return response.data;
});

// Allowed fields for a task
const allowedTaskFields = [
  "id",
  "title",
  "description",
  "estimatedHours",
  "inProgressStartTime",
  "assignee",
  "priority",
  "status",
  "featureId",
  "sprintId",
];

const aiEpicSlice = createSlice({
  name: "aiEpic",
  initialState: {
    data: { sprints: {}, features: {}, tasks: {} },
    loading: false,
    error: null,
  },
  reducers: {
    updateFeatureById: (state, action) => {
      const { id, updates } = action.payload;
      if (state.data?.features?.[id]) {
        state.data.features[id] = {
          ...state.data.features[id],
          ...updates,
        };
      }
    },

    addTask: (state, action) => {
      const rawTask = action.payload;
      const { id, featureId, sprintId } = rawTask;

      if (!state.data || !id || !featureId || !sprintId) return;

      // Step 1: If feature doesn't exist, create it using raw task fields (before cleaning)
      if (!state.data.features[featureId]) {
        state.data.features[featureId] = {
          id: featureId,
          title: rawTask.featureTitle || "Untitled Feature",
          description: rawTask.featureDescription || "",
          priority: rawTask.featurePriority || "medium",
          sprintId,
          taskIds: [],
        };
      }

      // Step 2: Clean the task fields using allowedTaskFields
      const cleanedTask = allowedTaskFields.reduce((acc, key) => {
        if (rawTask[key] !== undefined) acc[key] = rawTask[key];
        return acc;
      }, {});

      // Add default status if not present
      if (!cleanedTask.status) cleanedTask.status = "todo";

      // Step 3: Add taskId to feature
      const feature = state.data.features[featureId];
      if (!feature.taskIds.includes(id)) {
        feature.taskIds.push(id);
      }

      // Step 4: Add featureId to sprint
      const sprint = state.data.sprints?.[sprintId];
      if (sprint && !sprint.featureIds.includes(featureId)) {
        sprint.featureIds.push(featureId);
      }

      // Step 5: Add cleaned task to tasks list
      state.data.tasks[id] = cleanedTask;
    },

    updateTaskById: (state, action) => {
      const { id, updates } = action.payload;
      const existingTask = state.data?.tasks?.[id];
      if (!existingTask) return;

      console.log(updates);

      const oldFeatureId = existingTask.featureId;
      const oldSprintId = existingTask.sprintId;

      const newFeatureId = updates.featureId || oldFeatureId;
      const newSprintId = updates.sprintId || oldSprintId;

      // Step 1: Create new feature if needed
      if (!state.data.features[newFeatureId]) {
        state.data.features[newFeatureId] = {
          id: newFeatureId,
          title: updates.featureTitle || "Untitled Feature",
          description: updates.featureDescription || "",
          priority: updates.featurePriority || "medium",
          sprintId: newSprintId,
          taskIds: [],
        };
      }

      if (newFeatureId !== oldFeatureId) {
        // Step 2: Add task ID to new feature
        const newFeature = state.data.features[newFeatureId];
        if (!newFeature.taskIds.includes(id)) {
          newFeature.taskIds.push(id);
        }
        const oldFeature = state.data.features?.[oldFeatureId];
        if (oldFeature) {
          oldFeature.taskIds = oldFeature.taskIds.filter((tid) => tid !== id);

          if (oldFeature.taskIds.length === 0) {
            delete state.data.features[oldFeatureId];

            const oldSprint = state.data.sprints?.[oldSprintId];
            if (oldSprint) {
              oldSprint.featureIds = oldSprint.featureIds.filter(
                (fid) => fid !== oldFeatureId,
              );
            }
          }
        }
      }

      // Step 3: Ensure sprint includes feature
      const newSprint = state.data.sprints?.[newSprintId];
      if (newSprint && !newSprint.featureIds.includes(newFeatureId)) {
        newSprint.featureIds.push(newFeatureId);
      }

      // Step 4: Remove task from old feature

      // Step 5: Only allow whitelisted updates
      const whitelistedUpdates = allowedTaskFields.reduce((acc, key) => {
        if (updates[key] !== undefined) acc[key] = updates[key];
        return acc;
      }, {});
      console.log("Whitelisted", whitelistedUpdates);
      // Step 6: Safely update task by merging into the full task
      state.data.tasks[id] = {
        ...existingTask,
        ...whitelistedUpdates,
        featureId: newFeatureId,
        sprintId: newSprintId,
      };
    },

    deleteTaskById: (state, action) => {
      const taskId = action.payload;
      const task = state.data?.tasks?.[taskId];
      if (!task) return;

      const { featureId, sprintId } = task;

      const feature = state.data.features?.[featureId];
      if (feature) {
        feature.taskIds = feature.taskIds.filter((id) => id !== taskId);
        if (feature.taskIds.length === 0) {
          delete state.data.features[featureId];

          const sprint = state.data.sprints?.[sprintId];
          if (sprint) {
            sprint.featureIds = sprint.featureIds.filter(
              (fid) => fid !== featureId,
            );
          }
        }
      }

      delete state.data.tasks[taskId];
    },

    deleteFeatureById: (state, action) => {
      const { featureId, sprintId } = action.payload;
      const feature = state.data?.features?.[featureId];
      if (!feature || feature.sprintId !== sprintId) return;

      feature.taskIds.forEach((taskId) => {
        const task = state.data.tasks?.[taskId];
        if (task && task.sprintId === sprintId) {
          delete state.data.tasks[taskId];
        }
      });

      delete state.data.features[featureId];

      const sprint = state.data.sprints?.[sprintId];
      if (sprint) {
        sprint.featureIds = sprint.featureIds.filter(
          (fid) => fid !== featureId,
        );
      }
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAIEpic.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAIEpic.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAIEpic.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default aiEpicSlice.reducer;
export const {
  updateFeatureById,
  updateTaskById,
  deleteFeatureById,
  deleteTaskById,
  addTask,
} = aiEpicSlice.actions;
