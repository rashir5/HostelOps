import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Rooms } from './pages/Rooms';
import { Allocations } from './pages/Allocations';
import { PassRequests } from './pages/PassRequests';
import { Complaints } from './pages/Complaints';
import { GateActivity } from './pages/GateActivity';
import { Announcements } from './pages/Announcements';
import { GuardPortal } from './pages/GuardPortal';
import { StudentPortal } from './pages/StudentPortal';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Admin & Warden Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin', 'warden']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="gate-activity" element={<GateActivity />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="passes" element={<PassRequests />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="allocations" element={<Allocations />} />
          </Route>

          {/* Guard Role Protected Route */}
          <Route
            path="/guard-portal"
            element={
              <ProtectedRoute allowedRoles={['guard']}>
                <GuardPortal />
              </ProtectedRoute>
            }
          />

          {/* Student Role Protected Route */}
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
