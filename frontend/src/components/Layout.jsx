import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  History,
  Ticket,
  Wrench,
  Menu,
  X,
  LogOut,
  Shield,
  UserCheck,
  Megaphone
} from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Rooms & Beds', path: '/rooms', icon: Building2 },
    { label: 'Gate Activity', path: '/gate-activity', icon: Shield },
    { label: 'Announcements', path: '/announcements', icon: Megaphone },
    { label: 'Pass Requests', path: '/passes', icon: Ticket },
    { label: 'Complaints', path: '/complaints', icon: Wrench },
    { label: 'Allocations', path: '/allocations', icon: History }
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/students':
        return 'Student Directory';
      case '/rooms':
        return 'Room Map & Occupancy';
      case '/gate-activity':
        return 'Gate Activity & Access Control';
      case '/announcements':
        return 'Campus Announcements';
      case '/passes':
        return 'Pass Requests & Movements';
      case '/complaints':
        return 'Maintenance & Complaints';
      case '/allocations':
        return 'Allocation Audit Trail';
      default:
        return 'Admin Workspace';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center font-black text-lg text-white shadow-lg shadow-blue-500/30">
              HO
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-none">HostelOps</h1>
              <span className="text-[11px] text-slate-400 font-medium">Campus Management</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Label */}
        <div className="px-6 pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {user?.role?.toUpperCase()} WORKSPACE
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 font-bold grid place-items-center text-sm border border-blue-500/30">
                {user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-medium capitalize">
                  <Shield className="w-3 h-3" />
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 rounded-lg transition border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{user?.name} ({user?.role})</span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1.5 border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
