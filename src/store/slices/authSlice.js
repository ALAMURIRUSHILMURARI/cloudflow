import { createSlice } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const initialSession = authService.getCurrentSession();

const initialState = {
  user: initialSession ? initialSession.user : null,
  token: initialSession ? initialSession.token : null,
  isAuthenticated: !!initialSession,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
});

export const {
  setLoading,
  loginSuccess,
  loginFailure,
  logout,
  setUser,
  updateUserProfile,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
