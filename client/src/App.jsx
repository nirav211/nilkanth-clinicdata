import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ToastProvider from './components/Toast';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import AddPatient from './pages/AddPatient';
import Patients from './pages/Patients';
import FinalReport from './pages/FinalReport';
import DesignSystem from './pages/DesignSystem';
import { getCurrentUser } from './api/mockApi';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Nilkanth Clinic Runtime Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-hairline rounded-[6px] p-6 shadow-card space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-mint text-brand flex items-center justify-center mx-auto text-22 font-bold">
              +
            </div>
            <h2 className="text-17 font-semibold text-ink">Nilkanth Clinic Register</h2>
            <p className="text-13 text-muted">
              A temporary display error occurred. You can reload the page or sign in again.
            </p>
            {this.state.error?.message && (
              <div className="text-11 font-mono text-left bg-surface-subtle p-2.5 rounded border border-hairline text-muted break-words">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-brand text-white rounded-[4px] text-13 font-medium hover:bg-brand-hover"
              >
                Reload ledger
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-white border border-hairline text-ink rounded-[4px] text-13 font-medium hover:border-brand"
              >
                Sign in again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const user = getCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/add"
              element={
                <ProtectedRoute>
                  <AddPatient />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <FinalReport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/design"
              element={
                <ProtectedRoute>
                  <DesignSystem />
                </ProtectedRoute>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/patients" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/patients" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

