'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, BookOpen, CheckSquare, Clock, 
  FileText, Calendar, Award, User, Bell, DollarSign, Home, Menu, X, CreditCard
} from 'lucide-react';

const icons: Record<string, any> = {
  dashboard: LayoutDashboard,
  classes: BookOpen,
  students: Users,
  attendance: CheckSquare,
  timetable: Clock,
  assignments: FileText,
  exams: Calendar,
  grades: Award,
  results: Award,
  profile: User,
  fees: DollarSign,
  payments: CreditCard,
  documents: FileText,
  notifications: Bell,
  announcements: Bell,
  children: Users,
};

const navItems = [{"name": "Dashboard", "href": "/dashboard", "slug": "dashboard"}, {"name": "Profile", "href": "/profile", "slug": "profile"}, {"name": "Attendance", "href": "/attendance", "slug": "attendance"}, {"name": "Timetable", "href": "/timetable", "slug": "timetable"}, {"name": "Assignments", "href": "/assignments", "slug": "assignments"}, {"name": "Exams", "href": "/exams", "slug": "exams"}, {"name": "Results", "href": "/results", "slug": "results"}, {"name": "Fees", "href": "/fees", "slug": "fees"}, {"name": "Documents", "href": "/documents", "slug": "documents"}, {"name": "Notifications", "href": "/notifications", "slug": "notifications"}, {"name": "Announcements", "href": "/announcements", "slug": "announcements"}];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <span className="text-lg font-bold text-violet-400">🏫 Student Web</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = icons[item.slug] || LayoutDashboard;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                  active ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:text-slate-900">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {pathname.split('/')[1] || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
              Student Web
            </span>
            <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
              U
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
