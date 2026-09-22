import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, ChevronRight } from 'lucide-react';
import RequestStatusBadge from '../requests/RequestStatusBadge';

export const RecentRequests = ({ requests = [] }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Recent Workflow Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">Live execution audit trail</p>
        </div>
        <Link
          to="/requests"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View all requests</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-3">Request ID</th>
              <th scope="col" className="px-6 py-3">Requisition Title</th>
              <th scope="col" className="px-6 py-3">Requester</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Current Step</th>
              <th scope="col" className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {requests.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-xs text-slate-500">
                  No recent workflow requests found.
                </td>
              </tr>
            ) : (
              requests.slice(0, 5).map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs font-bold text-slate-900">
                    <Link to={`/requests/${req.id}`} className="hover:text-indigo-600 hover:underline">
                      {req.id}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                    {req.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-xs text-slate-500">
                    {req.requester?.name || 'Alex Morgan'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <RequestStatusBadge status={req.status} size="sm" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-xs text-slate-600 font-medium">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {req.currentStep || 'Submitted'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right text-xs">
                    <Link
                      to={`/requests/${req.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentRequests;
