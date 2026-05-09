import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice';
import aiEpicReducer from "./slices/aiEpicSlice"
import userReducer from "./slices/userSlice"

const store = configureStore({
  reducer: {
    project: projectReducer,
    aiEpic: aiEpicReducer,
    users: userReducer,
  },
});

export default store;
