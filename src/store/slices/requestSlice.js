import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  requests: [],
  currentRequest: null,
  loading: false,
  error: null,
  filter: 'all', // 'all', 'pending', 'approved', 'rejected'
  searchQuery: '',
};

const requestSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setRequests: (state, action) => {
      state.requests = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentRequest: (state, action) => {
      state.currentRequest = action.payload;
      state.loading = false;
      state.error = null;
    },
    addRequest: (state, action) => {
      state.requests = [action.payload, ...state.requests];
      state.currentRequest = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateRequest: (state, action) => {
      const updated = action.payload;
      state.requests = state.requests.map((r) => (r.id === updated.id ? updated : r));
      if (state.currentRequest && state.currentRequest.id === updated.id) {
        state.currentRequest = updated;
      }
      state.loading = false;
    },
    deleteRequest: (state, action) => {
      const id = action.payload;
      state.requests = state.requests.filter((r) => r.id !== id);
      if (state.currentRequest && state.currentRequest.id === id) {
        state.currentRequest = null;
      }
      state.loading = false;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    }
  },
});

export const {
  setLoading,
  setError,
  setRequests,
  setCurrentRequest,
  addRequest,
  updateRequest,
  deleteRequest,
  setFilter,
  setSearchQuery,
  clearCurrentRequest,
} = requestSlice.actions;

export default requestSlice.reducer;
