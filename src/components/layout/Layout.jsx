import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import { setRequests } from '../../store/slices/requestSlice';
import { setPendingApprovals } from '../../store/slices/approvalSlice';
import { setNotifications } from '../../store/slices/notificationSlice';
import requestService from '../../services/requestService';
import approvalService from '../../services/approvalService';
import notificationService from '../../services/notificationService';
import { Info, Server, Cpu, Database } from 'lucide-react';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();

  // Initialize global data stores on layout mount
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const [reqs, approvals, notifs] = await Promise.all([
          requestService.getRequests(),
          approvalService.getPendingApprovals(),
          notificationService.getNotifications()
        ]);
        dispatch(setRequests(reqs));
        dispatch(setPendingApprovals(approvals));
        dispatch(setNotifications(notifs));
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      }
    };
    loadAppData();
  }, [dispatch]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="lg:pl-64 flex min-h-screen flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Academic Capstone Notice Banner */}
        <div className="bg-indigo-900 text-indigo-100 text-xs px-4 py-2 border-b border-indigo-800 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
            <span className="font-semibold text-white">CAPSTONE ARCHITECTURE BENCHMARK:</span>
            <span className="text-indigo-200">Serverless Cloud Application Architecture • Multi-Cloud Active Resilience & Physical Edge Testbed</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-indigo-300">
            <span className="flex items-center gap-1"><Server className="h-3 w-3" /> AWS Serverless</span>
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Step Functions</span>
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> DynamoDB</span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
