import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axios.js";

// =================== THUNKS ===================

export const fetchUsers = createAsyncThunk(
  "users/fetchData",
  async () => {
    const res = await axios.get(`/api/users`);
    return res.data;
  },
);

// =================== SLICE ===================

const userSlice = createSlice({
  name: "users",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default userSlice.reducer; 