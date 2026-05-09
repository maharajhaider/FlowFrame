import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axios.js";



export const fetchProjectData = createAsyncThunk(
  "project/fetchData",
  async () => {
    const res = await axios.get(`/api/project`);
    return res.data;
  },
);

export const createProject = createAsyncThunk(
  "project/create",
  async ({ sprints, features, tasks }, thunkAPI) => {
    const { aiEpic } = thunkAPI.getState();

    const data = aiEpic?.data || {};
    const allSprints = data.sprints || {};
    const allFeatures = data.features || {};
    const allTasks = data.tasks || {};

    const formattedSprints = [...sprints].map(sprintId => {
      const sprint = allSprints[sprintId];
      return {
        title: sprint.title,
        description: sprint.description,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        featureIds: sprint.featureIds.filter(featureId => features.has(featureId))
      };
    });

    const formattedFeatures = Object.fromEntries(
      [...features].map((id) => [id, allFeatures[id]])
    );

    const formattedTasks = Object.fromEntries(
      [...tasks].map((id) => [id, allTasks[id]])
    );

    const payload = {
      name: "proj1",
      sprints: formattedSprints,
      features: formattedFeatures,
      tasks: formattedTasks,
    };
    
    const res = await axios.post("/api/project", payload);
    return res.data;
  },
);

export const createFeature = createAsyncThunk(
  "features/create",
  async (featureData) => {
    const res = await axios.post(`/api/features`, featureData);
    return res.data;
  },
);

export const createTask = createAsyncThunk("tasks/create", async (taskData) => {
  const res = await axios.post(`/api/tasks`, taskData);
  return res.data;
});

export const updateTask = createAsyncThunk("tasks/update", async (task) => {
  const res = await axios.put(`/api/tasks/${task._id}`, task);
  return res.data;
});

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ id, status }, thunkAPI) => {
    const { project } = thunkAPI.getState();
    const task = project.data.tasks[id];
    
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    const res = await axios.patch(`/api/tasks/${id}/status`, {
      status
    });
    
    return res.data;
  }
);

export const deleteTask = createAsyncThunk("tasks/delete", async (taskId) => {
  await axios.delete(`/api/tasks/${taskId}`);
  return taskId;
});

export const uploadAttachments = createAsyncThunk(
  "tasks/uploadAttachments",
  async ({ taskId, files }) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const res = await axios.post(`/api/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { taskId, attachments: res.data };
  }
);

export const fetchAttachments = createAsyncThunk(
  "tasks/fetchAttachments",
  async (taskId) => {
    const res = await axios.get(`/api/tasks/${taskId}/attachments`);
    return { taskId, attachments: res.data };
  }
);

export const deleteAttachment = createAsyncThunk(
  "tasks/deleteAttachment",
  async ({ taskId, attachmentId }) => {
    await axios.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`);
    return { taskId, attachmentId };
  }
);

export const addComment = createAsyncThunk(
  "tasks/addComment",
  async ({ taskId, text }) => {
    const res = await axios.post(`/api/tasks/${taskId}/comments`, { text });
    return { taskId, comment: res.data };
  }
);

export const fetchComments = createAsyncThunk(
  "tasks/fetchComments",
  async (taskId) => {
    const res = await axios.get(`/api/tasks/${taskId}/comments`);
    return { taskId, comments: res.data };
  }
);

export const deleteComment = createAsyncThunk(
  "tasks/deleteComment",
  async ({ taskId, commentId }) => {
    await axios.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    return { taskId, commentId };
  }
);

export const startSprint = createAsyncThunk(
  "sprints/start",
  async (sprintId) => {
    const res = await axios.patch(`/api/project/sprints/${sprintId}/start`);
    return res.data;
  }
);

export const completeSprint = createAsyncThunk(
  "sprints/complete",
  async (sprintId) => {
    const res = await axios.patch(`/api/project/sprints/${sprintId}/complete`);
    return res.data;
  }
);



const projectSlice = createSlice({
  name: "project",
  initialState: {
    data: {
      sprints: {},
      features: {},
      tasks: {},
    },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(fetchProjectData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectData.fulfilled, (state, action) => {
        state.loading = false;
        const raw = action.payload;

        state.data = {
          _id: raw._id,
          name: raw.name,
          sprints: Object.fromEntries(
            (raw.sprintIds || []).map((s) => [s._id, s]),
          ),
          features: Object.fromEntries(
            (raw.featureIds || []).map((f) => [f._id, f]),
          ),
          tasks: Object.fromEntries((raw.taskIds || []).map((t) => [t._id, t])),
        };
      })
      .addCase(fetchProjectData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        const raw = action.payload;

        state.data = {
          _id: raw._id,
          name: raw.name,
          sprints: Object.fromEntries(
            (raw.sprintIds || []).map((s) => [s._id, s]),
          ),
          features: Object.fromEntries(
            (raw.featureIds || []).map((f) => [f._id, f]),
          ),
          tasks: Object.fromEntries((raw.taskIds || []).map((t) => [t._id, t])),
        };
      })

      .addCase(createFeature.fulfilled, (state, action) => {
        const feature = action.payload;
        if (!state.data.features) {
          state.data.features = {};
        }
        state.data.features[feature._id] = feature;
      })

      .addCase(createTask.fulfilled, (state, action) => {
        const task = action.payload;
        const { _id, featureId } = task;
        state.data.tasks[_id] = { _id, ...task };

        if (state.data.features[featureId]) {
          state.data.features[featureId].taskIds.push(_id);
        } else {
          console.error(" Feature not found in Redux store for ID:", featureId);
        }
      })

      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        const { _id, featureId } = updatedTask;

        const oldTask = state.data.tasks[_id];
        const oldFeatureId = oldTask?.featureId;

        state.data.tasks[_id] = updatedTask;

        if (featureId !== oldFeatureId) {
          if (oldFeatureId && state.data.features[oldFeatureId]) {
            state.data.features[oldFeatureId].taskIds = state.data.features[
              oldFeatureId
            ].taskIds.filter((tid) => tid !== _id);
          }

          if (state.data.features[featureId]) {
            state.data.features[featureId].taskIds.push(_id);
          } else {
            console.warn(
              `Feature with id ${featureId} not found in Redux store (may be fresh or unfetched)`,
            );
          }
        }
      })

      .addCase(updateTaskStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTask = action.payload;
        const { _id } = updatedTask;
        
        if (state.data.tasks[_id]) {
          state.data.tasks[_id] = updatedTask;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        console.error('Failed to update task status:', action.error.message);
      })

      .addCase(deleteTask.fulfilled, (state, action) => {
        const taskId = action.payload;

        const taskToDelete = state.data.tasks[taskId];
        const featureId = taskToDelete?.featureId;

        delete state.data.tasks[taskId];

        if (featureId && state.data.features[featureId]) {
          state.data.features[featureId].taskIds = state.data.features[
            featureId
          ].taskIds.filter((tid) => tid !== taskId);
        }
      })

      .addCase(uploadAttachments.fulfilled, (state, action) => {
        const { taskId, attachments } = action.payload;
        if (state.data.tasks[taskId]) {
          if (!state.data.tasks[taskId].attachments) {
            state.data.tasks[taskId].attachments = [];
          }
          state.data.tasks[taskId].attachments.push(...attachments);
        }
      })

      .addCase(fetchAttachments.fulfilled, (state, action) => {
        const { taskId, attachments } = action.payload;
        if (state.data.tasks[taskId]) {
          state.data.tasks[taskId].attachments = attachments;
        }
      })

      .addCase(deleteAttachment.fulfilled, (state, action) => {
        const { taskId, attachmentId } = action.payload;
        if (state.data.tasks[taskId] && state.data.tasks[taskId].attachments) {
          state.data.tasks[taskId].attachments = state.data.tasks[taskId].attachments.filter(
            att => att._id !== attachmentId
          );
        }
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const { taskId, comment } = action.payload;
        if (state.data.tasks[taskId]) {
          if (!state.data.tasks[taskId].comments) {
            state.data.tasks[taskId].comments = [];
          }
          state.data.tasks[taskId].comments.push(comment);
        }
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        const { taskId, comments } = action.payload;
        if (state.data.tasks[taskId]) {
          state.data.tasks[taskId].comments = comments;
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { taskId, commentId } = action.payload;
        if (state.data.tasks[taskId] && state.data.tasks[taskId].comments) {
          state.data.tasks[taskId].comments = state.data.tasks[taskId].comments.filter(
            comment => comment._id !== commentId
          );
        }
      })
      .addCase(startSprint.fulfilled, (state, action) => {
        const updatedSprint = action.payload;
        if (state.data.sprints[updatedSprint._id]) {
          // Complete all other sprints
          Object.values(state.data.sprints).forEach(sprint => {
            if (sprint._id !== updatedSprint._id) {
              sprint.state = 'completed';
            }
          });
          // Update the started sprint
          state.data.sprints[updatedSprint._id] = updatedSprint;
        }
      })
      .addCase(completeSprint.fulfilled, (state, action) => {
        const updatedSprint = action.payload;
        if (state.data.sprints[updatedSprint._id]) {
          state.data.sprints[updatedSprint._id] = updatedSprint;
        }
      });
  },
});

export default projectSlice.reducer;
