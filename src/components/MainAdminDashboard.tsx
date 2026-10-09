import React, { useState, useEffect } from 'react';
import type { User, WorkRequest, SectionConfig, Role, SectionId, UserCategory } from '../types.ts';
import {
  fetchWorks,
  fetchUsers,
  createUser,
  fetchSections,
  fetchWorkers,
  deleteUser,
} from '../api.ts';
import {
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Phone,
  ShieldCheck,
  Building,
  RefreshCw,
  Search,
  Filter,
  Check,
  Radio,
  Send,
  Wrench,
  Sparkles,
  Zap,
  Calendar,
  Layers,
  MapPin,
  PauseCircle,
  Trash2,
  X,
  Shield,
} from 'lucide-react';

interface MainAdminDashboardProps {
  currentUser: User;
}

export const MainAdminDashboard: React.FC<MainAdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'works' | 'workers' | 'users'>('works');
  const [works, setWorks] = useState<WorkRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [workers, setWorkers] = useState<(User & { pendingCount: number })[]>([]);
  const [workerRoles, setWorkerRoles] = useState<string[]>(['cleaner', 'plumber', 'electrician']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filters for All Works tab
  const [sectionFilter, setSectionFilter] = useState<'all' | SectionId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reached' | 'postponed' | 'done'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'regular'>('all');
  const [workerRoleFilter, setWorkerRoleFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create User modal form state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userCategory, setUserCategory] = useState<'office_usage' | 'worker_usage'>('office_usage');
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('office_usage');
  const [isCustomWorkerRole, setIsCustomWorkerRole] = useState(false);
  const [customWorkerRoleName, setCustomWorkerRoleName] = useState('');
  const [newSectionId, setNewSectionId] = useState<SectionId>('section_1');
  const [newSectionCustomName, setNewSectionCustomName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Quick add worker trade modal in Workers tab
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [quickTradeName, setQuickTradeName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wList, uList, sList, wkList, rList] = await Promise.all([
        fetchWorks(),
        fetchUsers(),
        fetchSections(),
        fetchWorkers(),
        import('../api.ts').then((m) => m.fetchWorkerRoles()).catch(() => ['cleaner', 'plumber', 'electrician']),
      ]);
      setWorks(wList);
      setUsers(uList);
      setSections(sList);
      setWorkers(wkList);
      setWorkerRoles(rList.length > 0 ? rList : ['cleaner', 'plumber', 'electrician']);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync default role when category switches
  const handleCategoryChange = (cat: 'office_usage' | 'worker_usage') => {
    setUserCategory(cat);
    setIsCustomWorkerRole(false);
    setCustomWorkerRoleName('');
    if (cat === 'office_usage') {
      setNewRole('office_usage');
    } else {
      setNewRole(workerRoles[0] || 'cleaner');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword.trim()) {
      setError('Please fill all required user fields (Username, Full Name, Password).');
      return;
    }

    const assignedRole =
      userCategory === 'worker_usage' && isCustomWorkerRole
        ? customWorkerRoleName.trim().toLowerCase()
        : newRole;

    if (!assignedRole) {
      setError('Please specify a valid system role for this user account.');
      return;
    }

    try {
      setCreateUserLoading(true);
      setError(null);
      await createUser({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        password: newPassword,
        role: assignedRole,
        category: userCategory,
        sectionId: assignedRole === 'section_office' ? newSectionId : undefined,
        sectionCustomName: assignedRole === 'section_office' && newSectionCustomName ? newSectionCustomName.trim() : undefined,
        phoneNumber: newPhoneNumber.trim() || undefined,
      });

      setSuccessNotice(`User account "${newUsername}" created successfully with role: ${assignedRole}`);
      setShowCreateUserModal(false);
      // Reset form
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setIsCustomWorkerRole(false);
      setCustomWorkerRoleName('');
      setNewSectionCustomName('');
      setNewPhoneNumber('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error creating user account.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleAddQuickTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTradeName.trim()) return;
    try {
      const { addWorkerRole } = await import('../api.ts');
      const updated = await addWorkerRole(quickTradeName.trim().toLowerCase());
      setWorkerRoles(updated);
      setSuccessNotice(`New worker trade "${quickTradeName.trim()}" added to the system.`);
      setQuickTradeName('');
      setShowAddTradeModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add worker trade.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${username}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await deleteUser(userId);
      setSuccessNotice(`User account "${username}" was removed successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics computation
  const totalWorks = works.length;
  const pendingWorks = works.filter((w) => w.status === 'pending');
  const reachedWorks = works.filter((w) => w.status === 'reached');
  const postponedWorks = works.filter((w) => w.status === 'postponed');
  const completedWorks = works.filter((w) => w.status === 'done');

  // Filtered works for table
  const filteredWorks = works.filter((w) => {
    if (sectionFilter !== 'all' && w.sectionId !== sectionFilter) return false;
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && w.urgency !== urgencyFilter) return false;
    if (workerRoleFilter !== 'all' && w.workerRole !== workerRoleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        w.ticketNumber.toLowerCase().includes(q) ||
        w.problemDescription.toLowerCase().includes(q) ||
        w.campusLocation.toLowerCase().includes(q) ||
        w.assignedWorkerName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ADMINISTRATIVE OVERVIEW HEADER CARD */}
      <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087A50] text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Main Administrator • Full Institutional Authority</span>
          </div>
          <h2 className="text-2xl font-black text-[#172A24] tracking-tight mt-1">
            Campus Operations Overview
          </h2>
          <p className="text-xs text-[#697B72] mt-1 font-medium">
            Centralized User Creation & Campus Oversight • Primary Phone: <strong className="text-[#172A24] font-mono">+918136867930</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-b from-[#098859] via-[#087A50] to-[#075B40] hover:from-[#0a9663] hover:to-[#064f37] text-white rounded-2xl text-xs font-bold shadow-[0_6px_16px_rgba(8,122,80,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] active:translate-y-0.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New User Account</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-white hover:bg-[#F8FAF9] text-[#172A24] rounded-2xl border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)] transition disabled:opacity-50"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 text-[#087A50] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-[#E4F2E9] border border-[#D2E4D8] text-[#075B40] text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="p-1 hover:bg-[#D2E4D8] rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KEY METRIC KPI CARDS (CLAYMORPHISM) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#697B72] text-[11px] font-bold uppercase tracking-wider">Total Campus Tickets</div>
          <div className="text-2xl font-black text-[#172A24] mt-1.5">{totalWorks}</div>
          <div className="text-[11px] text-[#697B72] mt-0.5">Across all departments</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-amber-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Backlog</span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{pendingWorks.length}</div>
          <div className="text-[11px] text-amber-800/80 mt-0.5">Awaiting staff arrival</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-sky-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>Staff On Site</span>
          </div>
          <div className="text-2xl font-black text-sky-700 mt-1.5">{reachedWorks.length}</div>
          <div className="text-[11px] text-sky-800/80 mt-0.5">Actively working</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-orange-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <PauseCircle className="w-3 h-3 text-orange-600" />
            <span>Postponed Tasks</span>
          </div>
          <div className="text-2xl font-black text-orange-700 mt-1.5">{postponedWorks.length}</div>
          <div className="text-[11px] text-orange-800/80 mt-0.5">Reason & tools noted</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#087A50] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#229B68]" />
            <span>Resolved Tickets</span>
          </div>
          <div className="text-2xl font-black text-[#087A50] mt-1.5">{completedWorks.length}</div>
          <div className="text-[11px] text-[#087A50]/80 mt-0.5">Completed & verified</div>
        </div>
      </div>

      {/* NAVIGATION TABS (SECTION NAMES & CONTACTS LIST REMOVED AS REQUESTED) */}
      <div className="flex items-center gap-2 border-b border-[#DCE8E0] pb-2">
        <button
          onClick={() => setActiveTab('works')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'works'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Campus Work Tickets</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'works' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {totalWorks}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory & Access Control</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'workers'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Field Staff Capacity</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'workers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {workers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CAMPUS WORK TICKETS (SHOWING 7 CAMPUS WORK TICKETS ETC.) */}
      {activeTab === 'works' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#697B72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tickets, problems, locations, workers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24]"
              >
                <option value="all">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending ({pendingWorks.length})</option>
                <option value="reached">Reached on Site ({reachedWorks.length})</option>
                <option value="postponed">Postponed ({postponedWorks.length})</option>
                <option value="done">Completed ({completedWorks.length})</option>
              </select>

              <select
                value={workerRoleFilter}
                onChange={(e) => setWorkerRoleFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] capitalize"
              >
                <option value="all">All Worker Trades</option>
                {workerRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
                <option value="guest_worker">Guest Worker</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-[#DCE8E0] rounded-3xl overflow-hidden shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)]">
            <div className="p-4 border-b border-[#DCE8E0] flex items-center justify-between bg-[#F8FAF9]">
              <h3 className="text-sm font-bold text-[#172A24]">
                Showing {filteredWorks.length} Campus Work Tickets
              </h3>
              <span className="text-[11px] text-[#697B72]">
                Real-time campus registry
              </span>
            </div>

            {filteredWorks.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-[#172A24]">No campus tickets found</p>
                <p className="text-xs text-[#697B72] mt-0.5">
                  Tickets created by section offices will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#172A24]">
                  <thead className="bg-[#F8FAF9] text-[#697B72] uppercase text-[10px] font-bold tracking-wider border-b border-[#DCE8E0]">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Problem Description & Campus Location</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Worker & Trade</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBF2ED]">
                    {filteredWorks.map((w) => (
                      <tr key={w.id} className="hover:bg-[#F8FAF9]/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#087A50] whitespace-nowrap">
                          {w.ticketNumber}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                          {w.sectionName || w.sectionId}
                        </td>

                        {/* Divided into two distinct lines: Line 1 Problem, Line 2 Location */}
                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="space-y-1">
                            <div className="font-bold text-[#172A24] leading-snug">
                              <span className="text-[#697B72] text-[11px] font-semibold block uppercase tracking-wider">
                                Problem:
                              </span>
                              {w.problemDescription}
                            </div>
                            <div className="text-xs text-[#087A50] font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#087A50] shrink-0" />
                              <span>{w.campusLocation}</span>
                            </div>
                            {w.status === 'postponed' && (
                              <div className="mt-1.5 p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-[11px] space-y-1">
                                {w.postponeCause && (
                                  <div>
                                    <span className="font-bold">Postpone Cause:</span> {w.postponeCause}
                                  </div>
                                )}
                                {w.neededTools && (
                                  <div className="font-bold text-purple-700 flex items-center gap-1">
                                    <Wrench className="w-3 h-3" />
                                    <span>Tools Needed: {w.neededTools}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {w.scheduleDate ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#DCE8E0] shadow-sm text-xs font-semibold text-[#172A24]">
                              <Calendar className="w-3.5 h-3.5 text-[#087A50]" />
                              <span>{w.scheduleDate}</span>
                              {w.scheduleTime && (
                                <span className="text-[#697B72] text-[11px]">({w.scheduleTime})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#697B72] italic text-xs">Standard</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-[#172A24] text-xs">{w.assignedWorkerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E4F2E9] text-[#075B40] border border-[#D2E4D8] capitalize">
                              {w.isGuestWorker ? '★ Guest' : w.workerRole.replace('_', ' ')}
                            </span>
                            {w.assignedWorkerPhone && (
                              <span className="text-[10px] text-[#697B72] font-mono">
                                {w.assignedWorkerPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {w.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max shadow-sm">
                              <Clock className="w-3 h-3 text-amber-600" />
                              PENDING
                            </span>
                          )}
                          {w.status === 'reached' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1 w-max shadow-sm">
                              <MapPin className="w-3 h-3 text-sky-600" />
                              ON SITE (REACHED)
                            </span>
                          )}
                          {w.status === 'postponed' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 w-max shadow-sm">
                              <PauseCircle className="w-3 h-3 text-orange-600" />
                              POSTPONED
                            </span>
                          )}
                          {w.status === 'done' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-max shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              DONE
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-[#697B72]">
                          <div>{new Date(w.createdAt).toLocaleDateString()}</div>
                          <div>{new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CENTRAL USER DIRECTORY & ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172A24]">Central User Directory & Access Authority</h3>
              <p className="text-xs text-[#697B72]">
                Main Admin has exclusive authority over creating Office Usage, Section Offices, and Worker credentials.
              </p>
            </div>

            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2 bg-[#087A50] hover:bg-[#075B40] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New User Account</span>
            </button>
          </div>

          <div className="bg-white border border-[#DCE8E0] rounded-3xl overflow-hidden shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#172A24]">
                <thead className="bg-[#F8FAF9] text-[#697B72] uppercase text-[10px] font-bold tracking-wider border-b border-[#DCE8E0]">
                  <tr>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Assigned Section</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2ED]">
                  {users.map((u) => {
                    const sec = sections.find((s) => s.id === u.sectionId);
                    return (
                      <tr key={u.id} className="hover:bg-[#F8FAF9]/80 transition">
                        <td className="py-3 px-4 font-bold text-[#172A24]">
                          {u.fullName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#087A50]">
                          {u.username}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E4F2E9] text-[#075B40] border border-[#D2E4D8] uppercase">
                            {u.category === 'worker_usage' ? "Worker' Usage" : u.category === 'office_usage' ? "Office Usage" : "Admin"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-[#DCE8E0] text-[#172A24] capitalize">
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.sectionId ? (
                            <span className="text-[#087A50] font-bold">
                              {u.sectionCustomName || sec?.name || u.sectionId}
                            </span>
                          ) : (
                            <span className="text-[#697B72]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#697B72]">
                          {u.phoneNumber || 'Not configured'}
                        </td>
                        <td className="py-3 px-4 text-[#697B72]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== 'main_admin' && u.username !== 'adminmuslih' ? (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title={`Delete ${u.username}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold transition shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 uppercase">
                              Primary Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD STAFF CAPACITY & WORKLOADS */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172A24]">
                Field Staff Capacity & Assignment Distribution
              </h3>
              <p className="text-xs text-[#697B72]">
                Active Cleaners, Plumbers, Electricians and custom trades created by Main Admin across campus.
              </p>
            </div>

            <button
              onClick={() => setShowAddTradeModal(true)}
              className="px-3.5 py-1.5 bg-[#E4F2E9] hover:bg-[#D2E4D8] text-[#075B40] rounded-xl text-xs font-bold border border-[#D2E4D8] flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add System Worker Trade</span>
            </button>
          </div>

          {workers.length === 0 ? (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl p-12 text-center shadow-sm">
              <p className="text-xs text-[#697B72]">No field staff registered yet. Click "Create New User Account" to add workers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workers.map((wk) => {
                const workerTasks = works.filter((w) => w.assignedWorkerId === wk.id);
                const workerPending = workerTasks.filter((w) => w.status === 'pending');
                const workerUrgent = workerPending.filter((w) => w.urgency === 'urgent');

                return (
                  <div
                    key={wk.id}
                    className="bg-white border border-[#DCE8E0] rounded-3xl p-5 shadow-[0_6px_16px_rgba(29,67,48,0.05)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-[#E4F2E9] text-[#087A50] font-black text-xs uppercase flex items-center justify-center border border-[#D2E4D8]">
                            {wk.role.slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#172A24]">{wk.fullName}</h4>
                            <span className="text-[11px] text-[#087A50] font-semibold capitalize">{wk.role}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-[#F8FAF9] text-[#697B72] border border-[#DCE8E0]">
                          @{wk.username}
                        </span>
                      </div>

                      <div className="text-xs text-[#172A24] space-y-1.5 mb-4 bg-[#F8FAF9] p-3 rounded-2xl border border-[#DCE8E0]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#697B72]">Contact Phone:</span>
                          <span className="font-mono font-bold text-[#087A50]">{wk.phoneNumber || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#697B72]">Total Assigned:</span>
                          <span className="font-bold text-[#172A24]">{workerTasks.length} tickets</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#697B72]">Pending Backlog:</span>
                          <span className={`font-bold ${workerPending.length > 0 ? 'text-amber-700' : 'text-[#697B72]'}`}>
                            {workerPending.length} pending
                          </span>
                        </div>
                      </div>

                      {/* Active task preview */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-[#697B72] uppercase tracking-wider">
                          Active Tasks ({workerPending.length}):
                        </div>
                        {workerPending.length === 0 ? (
                          <p className="text-xs text-[#087A50] font-medium italic">No pending tasks. Worker available.</p>
                        ) : (
                          workerPending.slice(0, 3).map((task) => (
                            <div key={task.id} className="p-2 rounded-xl bg-white border border-[#DCE8E0] text-xs shadow-sm">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-[#087A50] font-bold">{task.ticketNumber}</span>
                                {task.urgency === 'urgent' && (
                                  <span className="text-red-700 text-[10px] font-bold">URGENT</span>
                                )}
                              </div>
                              <p className="text-[#172A24] line-clamp-1 mt-0.5 font-medium">{task.problemDescription}</p>
                              <p className="text-[10px] text-[#697B72]">{task.campusLocation}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE USER MODAL (CLAYMORPHISM) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#E4F2E9] text-[#087A50] flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172A24]">Create New User Account</h3>
                  <p className="text-[11px] text-[#697B72]">Full authority exclusive to Main Admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* CATEGORY SELECTOR: Office Usage vs Worker' Usage */}
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                  Account Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('office_usage')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition ${
                      userCategory === 'office_usage'
                        ? 'bg-[#E4F2E9] border-[#087A50] text-[#075B40] shadow-sm'
                        : 'bg-white border-[#DCE8E0] text-[#697B72] hover:bg-[#F8FAF9]'
                    }`}
                  >
                    Office Usage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('worker_usage')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition ${
                      userCategory === 'worker_usage'
                        ? 'bg-[#E4F2E9] border-[#087A50] text-[#075B40] shadow-sm'
                        : 'bg-white border-[#DCE8E0] text-[#697B72] hover:bg-[#F8FAF9]'
                    }`}
                  >
                    Worker' Usage
                  </button>
                </div>
              </div>

              {/* SYSTEM ROLE SELECTION */}
              {userCategory === 'office_usage' ? (
                <div>
                  <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                    Office System Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50]"
                  >
                    <option value="office_usage">Office Usage (Central Directorate Desk)</option>
                    <option value="section_office">Section Office User (Campus Wing Manager)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                    Worker Trade Role *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      disabled={isCustomWorkerRole}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] capitalize disabled:opacity-50"
                    >
                      {workerRoles.map((r) => (
                        <option key={r} value={r}>
                          {r.replace('_', ' ')}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCustomWorkerRole(!isCustomWorkerRole)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap transition ${
                        isCustomWorkerRole
                          ? 'bg-[#087A50] text-white border-[#087A50]'
                          : 'bg-white border-[#DCE8E0] text-[#172A24] hover:bg-[#F8FAF9]'
                      }`}
                    >
                      {isCustomWorkerRole ? 'Custom Trade' : '+ New Trade'}
                    </button>
                  </div>

                  {isCustomWorkerRole && (
                    <input
                      type="text"
                      required={isCustomWorkerRole}
                      placeholder="Type custom trade (e.g. painter, carpenter, AC technician...)"
                      value={customWorkerRoleName}
                      onChange={(e) => setCustomWorkerRoleName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#087A50] rounded-xl text-xs text-[#172A24] shadow-sm animate-in fade-in"
                    />
                  )}
                </div>
              )}

              {/* IF SECTION OFFICE: Section assignment & custom section name */}
              {userCategory === 'office_usage' && newRole === 'section_office' && (
                <div className="p-3.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-2xl space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172A24] uppercase mb-1">
                      Assigned Section Office *
                    </label>
                    <select
                      value={newSectionId}
                      onChange={(e) => setNewSectionId(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24]"
                    >
                      <option value="section_1">Section 1</option>
                      <option value="section_2">Section 2</option>
                      <option value="section_3">Section 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#172A24] uppercase mb-1">
                      Custom Section Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CHS, Degree Wing, Mosque Wing..."
                      value={newSectionCustomName}
                      onChange={(e) => setNewSectionCustomName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#172A24]"
                    />
                  </div>
                </div>
              )}

              {/* USER CREDENTIALS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sec1user, worker_ali..."
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Set secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammed Irfan, Central Office Desk..."
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24]"
                />
              </div>

              {/* PHONE NUMBER (KEPT FOR EXTERNAL USAGE AS REQUESTED) */}
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Contact Phone Number (For external records)
                </label>
                <input
                  type="text"
                  placeholder="+91 81368 67930"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="px-5 py-2.5 bg-[#087A50] hover:bg-[#075B40] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createUserLoading ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD TRADE MODAL */}
      {showAddTradeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0] mb-4">
              <h3 className="text-sm font-bold text-[#172A24]">Add New Worker Trade</h3>
              <button
                onClick={() => setShowAddTradeModal(false)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddQuickTrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Trade / Skill Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mason, Welder, Painter..."
                  value={quickTradeName}
                  onChange={(e) => setQuickTradeName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setShowAddTradeModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#087A50] hover:bg-[#075B40] text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Add Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
