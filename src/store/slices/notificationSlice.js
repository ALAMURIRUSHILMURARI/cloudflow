import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const calculateUnread = (items) => items.filter((n) => !n.read).length;

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = calculateUnread(action.payload);
      state.loading = false;
    },
    addNotification: (state, action) => {
      state.notifications = [action.payload, ...state.notifications];
      state.unreadCount = calculateUnread(state.notifications);
    },
    markAsRead: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      state.unreadCount = calculateUnread(state.notifications);
    },
    markAllAsRead: (state) => {
      state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
  },
});

export const {
  setLoading,
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
} = notificationSlice.actions;

export default notificationSlice.reducer;
