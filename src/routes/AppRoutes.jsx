import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from '../components/layout/Layout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import MyRequests from '../pages/MyRequests';
import NewRequest from '../pages/NewRequest';
import PurchaseRequest from '../pages/PurchaseRequest';
import LeaveRequest from '../pages/LeaveRequest';
import ExpenseRequest from '../pages/ExpenseRequest';
import SoftwareAccessRequest from '../pages/SoftwareAccessRequest';
import RequestDetails from '../pages/RequestDetails';
import Approvals from '../pages/Approvals';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';

/**
 * Route protection wrapper.
 * Redirects unauthenticated users to /login and preserves intended location.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Public route wrapper for login.
 * Redirects authenticated users to /dashboard.
 */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Routes enclosed in main App Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Requests Management & Dedicated Workflow Forms */}
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests/new/purchase" element={<PurchaseRequest />} />
        <Route path="requests/new/leave" element={<LeaveRequest />} />
        <Route path="requests/new/expense" element={<ExpenseRequest />} />
        <Route path="requests/new/software-access" element={<SoftwareAccessRequest />} />
        <Route path="requests/:id" element={<RequestDetails />} />

        {/* Approvals, Notifications, Profile & Settings */}
        <Route path="approvals" element={<Approvals />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
