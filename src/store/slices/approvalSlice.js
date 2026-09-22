import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  pendingApprovals: [],
  loading: false,
  error: null,
  activeApprovalModal: null, // Holds request being reviewed in modal
};

const approvalSlice = createSlice({
  name: 'approvals',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setPendingApprovals: (state, action) => {
      state.pendingApprovals = action.payload;
      state.loading = false;
      state.error = null;
    },
    openApprovalModal: (state, action) => {
      state.activeApprovalModal = action.payload;
    },
    closeApprovalModal: (state) => {
      state.activeApprovalModal = null;
    },
    removePendingApproval: (state, action) => {
      state.pendingApprovals = state.pendingApprovals.filter(
        (req) => req.id !== action.payload
      );
    }
  },
});

export const {
  setLoading,
  setError,
  setPendingApprovals,
  openApprovalModal,
  closeApprovalModal,
  removePendingApproval,
} = approvalSlice.actions;

export default approvalSlice.reducer;
