import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/mockApi';
import { LogOut, Menu, X, PlusCircle, Users, BarChart3, Stethoscope } from 'lucide-react';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';

/**
 * AppShell component
 * Real clinic management header with doctor credential banner, live OPD status,
 * light green & white palette, and clean ledger navigation.
 */
export function AppShell({ children }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Add patient', to: '/add', icon: PlusCircle },
    { label: 'Patients register', to: '/patients', icon: Users },
    { label: 'Final report', to: '/reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col text-ink selection:bg-brand-light selection:text-brand">
      {/* Clinic Top Bar / Doctor Credentials Banner */}
      <div className="bg-brand text-white text-11 sm:text-13 px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-brand-hover no-print">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="font-semibold tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Nilkanth Clinic & Day Care Centre
          </span>
          <span className="text-white/80 hidden md:inline">|</span>
          <span className="text-white/95 font-medium hidden md:inline">
            Dr. Jignesh Chauhan (B.A.M.S.)
          </span>
          <span className="text-white/80 hidden lg:inline">|</span>
          <span className="text-white/80 hidden lg:inline">
            Navrangpura, Ahmedabad
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto text-11 sm:text-13">
          <a
            href="tel:9033663170"
            className="text-white font-mono hover:underline flex items-center gap-1"
            title="Call Clinic"
          >
            <span>Mo:</span>
            <span className="font-semibold">90336 63170</span>
          </a>
          <span className="text-white/80 hidden sm:inline">|</span>
          <span className="text-white/90 font-mono hidden sm:inline">
            09:00 AM – 01:00 PM | 05:00 PM – 09:00 PM
          </span>
          <span className="bg-white/20 text-white px-2 py-0.5 rounded-[4px] font-mono text-11">
            Token Desk Active
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-surface border-b border-hairline sticky top-0 z-30 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink
              to="/patients"
              className="flex items-center gap-2.5 text-ink hover:text-brand transition-colors group"
            >
              <div className="w-8 h-8 rounded-[4px] bg-brand text-white flex items-center justify-center flex-shrink-0 font-bold text-17 shadow-sm">
                <Stethoscope size={18} />
              </div>
              <div>
                <span className="font-semibold text-17 sm:text-20 text-ink tracking-tight block leading-tight">
                  Nilkanth Clinic
                </span>
                <span className="text-11 text-muted hidden sm:block leading-none">
                  Patient register & accounts ledger
                </span>
              </div>
            </NavLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-[4px] text-15 font-medium transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-surface-subtle text-brand font-semibold border border-hairline'
                          : 'text-muted hover:text-ink hover:bg-surface-subtle/60'
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right Header Section */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/design"
              className={({ isActive }) =>
                `hidden sm:inline-flex items-center text-13 px-2.5 py-1 rounded-[4px] border ${
                  isActive
                    ? 'border-brand text-brand bg-surface-subtle font-medium'
                    : 'border-transparent text-muted hover:text-ink hover:border-hairline'
                }`
              }
            >
              Design system
            </NavLink>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-hairline">
                <span className="text-13 font-medium text-ink">
                  {user.name}
                </span>

                <Button
                  variant="secondary"
                  onClick={() => setShowSignoutConfirm(true)}
                  className="text-13 py-1 px-2.5 min-h-[32px] h-[32px]"
                >
                  <LogOut size={14} className="mr-1" />
                  Sign out
                </Button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="text-15 text-brand font-medium hover:underline px-2 py-1"
              >
                Sign in
              </NavLink>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-ink rounded-[4px] border border-hairline focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-hairline bg-surface px-4 py-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-[4px] text-15 font-medium ${
                      isActive
                        ? 'bg-surface-subtle text-brand font-semibold border border-hairline'
                        : 'text-muted hover:text-ink'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <div className="pt-2 border-t border-hairline flex items-center justify-between text-13">
              <NavLink
                to="/design"
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted hover:text-ink py-1"
              >
                Design system
              </NavLink>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowSignoutConfirm(true);
                  }}
                  className="text-red hover:underline py-1"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Clinic Footer */}
      <footer className="border-t border-hairline bg-surface mt-auto py-4 text-center text-13 text-muted no-print">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-medium text-ink">Nilkanth Clinic</span> — Patient register & billing ledger.
          </div>
          <div className="font-mono text-11">
            Dr. Jignesh Chauhan (B.A.M.S.) | Mobile: 90336 63170
          </div>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={showSignoutConfirm}
        title="Sign out of Nilkanth Clinic"
        message="Are you sure you want to sign out? Any unsaved entries on this screen will be lost."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignoutConfirm(false)}
      />
    </div>
  );
}

export default AppShell;
