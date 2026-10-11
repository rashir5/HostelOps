import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading HostelOps...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'student') {
      return <Navigate to="/student-portal" replace />;
    }
    if (user.role === 'guard') {
      return <Navigate to="/guard-portal" replace />;
    }
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-slate-200 text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full grid place-items-center mx-auto mb-4 font-bold text-xl">
            403
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your role ({user.role}) does not have permission to view this page.
          </p>
          <a
            href={user.role === 'student' ? '/student-portal' : user.role === 'guard' ? '/guard-portal' : '/dashboard'}
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition"
          >
            Go to My Workspace
          </a>
        </div>
      </div>
    );
  }

  return children;
};
