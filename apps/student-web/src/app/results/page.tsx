'use client';
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function ResultsPage() {
  return (
    <AppShell>
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Results</h2>
        <p className="text-sm text-slate-500 mt-1">View and interact with your personal results.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Current Status</p>
          <p className="text-3xl font-bold text-violet-600 mt-2">Active</p>
          <span className="text-xs text-emerald-600 font-semibold">Updated Today</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Upcoming Items</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">4</p>
          <span className="text-xs text-slate-500">Scheduled this week</span>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Action Required</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">1</p>
          <span className="text-xs text-amber-600">Pending confirmation</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Student Results Details</h3>
        <p className="text-slate-600 text-sm">
          Module details and records for student results are securely synchronized with the central School ERP backend.
        </p>
      </div>
    </AppShell>
  );
}
