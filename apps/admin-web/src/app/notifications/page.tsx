'use client';
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/common/PageHeader';

export default function NotificationsPage() {
  return (
    <AppShell>
      <PageHeader 
        title="Communications & Alert Broadcasts" 
        description="Targeted SMS, WhatsApp, Email alerts, push announcements, and system alerts." 
        action={
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm">
            + New Action
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Records</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">1,248</p>
          <span className="text-xs text-emerald-600 font-semibold">↑ 8.2% from last month</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Status</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">98.4%</p>
          <span className="text-xs text-slate-500">Operational</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending Actions</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">14</p>
          <span className="text-xs text-amber-600">Requires Review</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Communications & Alert Broadcasts Registry</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
              <tr>
                <th className="px-4 py-3">ID / Reference</th>
                <th className="px-4 py-3">Title / Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">REC-00{item}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">Standard notifications Item #{item}</td>
                  <td className="px-4 py-3 text-slate-600">Primary Division</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-3">View</button>
                    <button className="text-slate-600 hover:text-slate-800 font-medium text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
