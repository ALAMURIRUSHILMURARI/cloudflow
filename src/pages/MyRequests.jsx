import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  ShoppingCart, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  ChevronRight, 
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import EmptyState from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { setFilter, setSearchQuery } from '../store/slices/requestSlice';

const typeIcons = {
  purchase: ShoppingCart,
  leave: Calendar,
  expense: Receipt,
  software: ShieldCheck,
};

export const MyRequests = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { requests, filter, searchQuery } = useSelector((state) => state.requests);

  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [activeTab, setActiveTab] = useState(filter || 'all');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    dispatch(setFilter(tab));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    dispatch(setSearchQuery(val));
  };

  // Filter requests based on tab and search term
  const filteredRequests = requests.filter((req) => {
    const matchesTab = 
      activeTab === 'all' 
        ? true 
        : req.status?.toLowerCase() === activeTab.toLowerCase();

    const query = localSearch.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      req.id?.toLowerCase().includes(query) ||
      req.title?.toLowerCase().includes(query) ||
      req.type?.toLowerCase().includes(query) ||
      req.requester?.name?.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const tabCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Workflow Requisitions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track, inspect, and manage enterprise multi-stage approval processes.
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Requisition</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search by ID, title, requester..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Requests Table / Cards */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No requests match your criteria"
          description={
            localSearch 
              ? `No requests matching "${localSearch}" were found in ${activeTab} filter.`
              : `You currently have no ${activeTab === 'all' ? '' : activeTab} requisitions.`
          }
          actionLabel="Create New Request"
          onAction={() => navigate('/requests/new')}
          actionIcon={PlusCircle}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Request ID</th>
                  <th scope="col" className="px-6 py-3.5">Type</th>
                  <th scope="col" className="px-6 py-3.5">Requisition Title</th>
                  <th scope="col" className="px-6 py-3.5">Requester</th>
                  <th scope="col" className="px-6 py-3.5">Created Date</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Current Step</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((req) => {
                  const Icon = typeIcons[req.type] || FileText;
                  const dateStr = new Date(req.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr 
                      key={req.id} 
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* ID */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {req.id}
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 capitalize">
                          <Icon className="h-3.5 w-3.5 text-indigo-500" />
                          {req.type}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate">
                        {req.title}
                      </td>

                      {/* Requester */}
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-600">
                        <p className="font-medium text-slate-900">{req.requester?.name}</p>
                        <p className="text-[11px] text-slate-400">{req.requester?.department}</p>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                        {dateStr}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <RequestStatusBadge status={req.status} size="sm" />
                      </td>

                      {/* Current Step */}
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-medium text-slate-700">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 font-semibold">
                          {req.currentStep || 'Submitted'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 group-hover:text-indigo-800">
                          <span>Details</span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
