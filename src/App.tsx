import React, { useState, useEffect } from 'react';
import type { User } from './types.ts';
import { getCurrentUser, logoutUser, getStoredToken } from './api.ts';
import { Navbar } from './components/Navbar.tsx';
import { NotificationBanner } from './components/NotificationBanner.tsx';
import { LoginView } from './components/LoginView.tsx';
import { MainAdminDashboard } from './components/MainAdminDashboard.tsx';
import { OfficeUsageDashboard } from './components/OfficeUsageDashboard.tsx';
import { SectionOfficeDashboard } from './components/SectionOfficeDashboard.tsx';
import { WorkerDashboard } from './components/WorkerDashboard.tsx';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoadingInitial(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Session validation error:', err);
        setCurrentUser(null);
      } finally {
        setLoadingInitial(false);
      }
    };
    initAuth();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#F1F5F2] flex items-center justify-center text-[#172A24]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#087A50] border-t-transparent rounded-full animate-spin mx-auto shadow-md"></div>
          <p className="text-xs font-semibold tracking-wider text-[#697B72] uppercase">
            Connecting to UPDHITE Portal • Darul Huda Islamic University...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F2] text-[#172A24] flex flex-col justify-between selection:bg-[#E4F2E9] selection:text-[#087A50]">
      <div>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {/* Live Notification Bar Banner across the top of the window */}
        <NotificationBanner currentUser={currentUser} />

        <main key={refreshKey} className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {currentUser.role === 'main_admin' && (
            <MainAdminDashboard currentUser={currentUser} />
          )}

          {currentUser.role === 'office_usage' && (
            <OfficeUsageDashboard currentUser={currentUser} />
          )}

          {currentUser.role === 'section_office' && (
            <SectionOfficeDashboard currentUser={currentUser} />
          )}

          {(currentUser.category === 'worker_usage' ||
            !['main_admin', 'office_usage', 'section_office'].includes(currentUser.role)) && (
            <WorkerDashboard currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Institutional Claymorphism Footer */}
      <footer className="bg-white border-t border-[#DCE8E0] py-4 px-6 text-center text-xs text-[#697B72] shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-[#087A50]">UPDHITE</span>
            <span>•</span>
            <span>Darul Huda Islamic University Campus Operations System &copy; 2026</span>
          </div>
          <span className="text-[11px] text-[#697B72]/80">
            Chemmad, Tirurangadi, Malappuram — University Works & Engineering Directorate
          </span>
        </div>
      </footer>
    </div>
  );
}
