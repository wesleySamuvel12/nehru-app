'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, GraduationCap, Briefcase, BookOpen, 
  Calendar, CheckSquare, Clock, FileText, Award, DollarSign, 
  Library, Bus, Home, Activity, Shield, Bell, Folder, Users2, BarChart3, Menu, X
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: GraduationCap },
  { name: 'Parents', href: '/parents', icon: Users },
  { name: 'Teachers', href: '/teachers', icon: Users2 },
  { name: 'Employees', href: '/employees', icon: Briefcase },
  { name: 'Academics', href: '/academics', icon: BookOpen },
  { name: 'Classes', href: '/classes', icon: Folder },
  { name: 'Subjects', href: '/subjects', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: CheckSquare },
  { name: 'Timetable', href: '/timetable', icon: Clock },
  { name: 'Assignments', href: '/assignments', icon: FileText },
  { name: 'Exams', href: '/exams', icon: Calendar },
  { name: 'Grades', href: '/grades', icon: Award },
  { name: 'Fees', href: '/fees', icon: DollarSign },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Transport', href: '/transport', icon: Bus },
  { name: 'Hostel', href: '/hostel', icon: Home },
  { name: 'Health', href: '/health', icon: Activity },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Meetings', href: '/meetings', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <span className="text-lg font-bold text-blue-400">🏫 School ERP Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Admin Portal
            </span>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              AD
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
