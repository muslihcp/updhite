import React from 'react';
import type { User } from '../types.ts';
import { NotificationCenter } from './NotificationCenter.tsx';
import { LogOut, RefreshCw, Shield, Building2, UserCircle, Phone } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onRefresh, refreshing }) => {
  const getRoleLabel = () => {
    switch (user.role) {
      case 'main_admin':
        return 'Main Administrator';
      case 'office_usage':
        return 'Office Directorate';
      case 'section_office':
        if (user.sectionCustomName) return user.sectionCustomName;
        if (user.sectionId === 'section_1') return 'Section Office 1';
        if (user.sectionId === 'section_2') return 'Section Office 2';
        if (user.sectionId === 'section_3') return 'Section Office 3';
        return 'Section Office';
      case 'cleaner':
        return 'Campus Cleaner';
      case 'plumber':
        return 'Campus Plumber';
      case 'electrician':
        return 'Campus Electrician';
      default:
        return user.role.replace('_', ' ').toUpperCase();
    }
  };

  const getRoleBadgeStyle = () => {
    switch (user.role) {
      case 'main_admin':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'office_usage':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'section_office':
        return 'bg-[#E4F2E9] text-[#075B40] border-[#D2E4D8]';
      case 'cleaner':
        return 'bg-teal-100 text-teal-900 border-teal-200';
      case 'plumber':
        return 'bg-cyan-100 text-cyan-900 border-cyan-200';
      case 'electrician':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DCE8E0] shadow-[0_4px_16px_rgba(29,67,48,0.04)]">
      {/* Top Institutional Header */}
      <div className="bg-gradient-to-r from-[#075B40] via-[#087A50] to-[#075B40] px-4 py-1.5 text-xs text-emerald-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <span className="font-serif">جامعة دار الهدى الإسلامية</span>
          <span className="text-emerald-300">•</span>
          <span className="tracking-wider">DARUL HUDA ISLAMIC UNIVERSITY</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-emerald-200 text-[11px]">
          <span>Central Campus Works & Facility Directorate</span>
          <span>•</span>
          <span className="font-semibold text-white">UPDHITE Portal</span>
        </div>
      </div>

      {/* Main Navigation Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* UPDHITE Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#098859] via-[#087A50] to-[#075B40] text-white flex items-center justify-center font-extrabold text-sm tracking-wider shadow-[0_4px_12px_rgba(8,122,80,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-[#0a9e69]/40">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#172A24]">
                UPDHITE
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4F2E9] text-[#087A50] border border-[#D2E4D8]">
                Campus Operations
              </span>
            </div>
            <p className="text-[11px] text-[#697B72] font-medium leading-none mt-0.5">
              Darul Huda Islamic University Work Management
            </p>
          </div>
        </div>

        {/* Right Section: Notification Bar Trigger, Refresh, User Profile & Logout */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Real-time In-App Notification Center */}
          <NotificationCenter currentUser={user} />

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh database records"
            className="p-2.5 rounded-xl bg-white hover:bg-[#F8FAF9] text-[#172A24] border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#087A50] ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* User Profile Card */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F8FAF9] border border-[#DCE8E0] shadow-[inset_0_1px_2px_rgba(23,42,36,0.03)]">
            <div className="w-7 h-7 rounded-lg bg-white border border-[#DCE8E0] flex items-center justify-center text-[#087A50] font-bold text-xs shadow-sm">
              {user.fullName.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#172A24] flex items-center gap-1 leading-tight">
                <span>{user.fullName}</span>
                {user.role === 'main_admin' && <Shield className="w-3 h-3 text-purple-600" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1.5 py-0.2 rounded-full border text-[10px] font-semibold ${getRoleBadgeStyle()}`}>
                  {getRoleLabel()}
                </span>
                {user.phoneNumber && (
                  <span className="text-[10px] text-[#697B72] font-mono flex items-center gap-0.5">
                    <Phone className="w-2.5 h-2.5" />
                    {user.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold shadow-[0_2px_6px_rgba(217,79,82,0.08)] hover:border-red-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
