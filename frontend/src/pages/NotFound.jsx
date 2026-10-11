import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-900 p-4 text-center">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 font-black text-2xl rounded-2xl grid place-items-center mx-auto mb-4 border border-blue-500/20">
          404
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-xs text-slate-400 mb-6">
          The route you requested does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition shadow-lg shadow-blue-600/30"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
