import React, { useState, useEffect } from 'react';
import type { User, WorkRequest, SectionId } from '../types.ts';
import { fetchWorks, sendWorkerReminder } from '../api.ts';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bell,
  Building,
  Search,
  Filter,
  Phone,
  RefreshCw,
  Send,
  MapPin,
  PauseCircle,
  Wrench,
  Sparkles,
  PackagePlus,
  UserCheck,
  Calendar,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';

interface OfficeUsageDashboardProps {
  currentUser: User;
}

export const OfficeUsageDashboard: React.FC<OfficeUsageDashboardProps> = ({ currentUser }) => {
  const [works, setWorks] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<'all' | SectionId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reached' | 'postponed' | 'done'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'regular'>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active view tab
  const [viewTab, setViewTab] = useState<'works' | 'requisitions' | 'guest_workers'>('works');

  // Reminder in progress
  const [remindingWorkId, setRemindingWorkId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const wList = await fetchWorks();
      setWorks(wList);
    } catch (err: any) {
      setError(err.message || 'Failed to load works for Office Usage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReminder = async (work: WorkRequest) => {
    if (
      !window.confirm(
        `Send in-app reminder to worker "${work.assignedWorkerName}" on their window regarding ticket ${work.ticketNumber}?`
      )
    ) {
      return;
    }

    try {
      setRemindingWorkId(work.id);
      setError(null);
      await sendWorkerReminder(work.id);
      setSuccessNotice(
        `In-app reminder for ticket ${work.ticketNumber} delivered directly to worker "${work.assignedWorkerName}" on their window.`
      );
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch in-app reminder.');
    } finally {
      setRemindingWorkId(null);
    }
  };

  const pendingWorks = works.filter((w) => w.status === 'pending');
  const reachedWorks = works.filter((w) => w.status === 'reached');
  const postponedWorks = works.filter((w) => w.status === 'postponed');
  const doneWorks = works.filter((w) => w.status === 'done');

  // Specific requisitions & guest worker tasks notified to Office Usage
  const toolRequisitionWorks = works.filter((w) => !!w.neededTools && w.status !== 'done');
  const guestWorkerWorks = works.filter((w) => w.isGuestWorker || w.workerRole === 'guest_worker');

  // Distinct trade roles present in data
  const tradeRoles = Array.from(new Set(works.map((w) => w.workerRole))).filter(Boolean);

  const filteredWorks = works.filter((w) => {
    if (sectionFilter !== 'all' && w.sectionId !== sectionFilter) return false;
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && w.urgency !== urgencyFilter) return false;
    if (tradeFilter !== 'all' && w.workerRole !== tradeFilter) return false;
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
      
      {/* HEADER BANNER CARD */}
      <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087A50] text-xs font-bold uppercase tracking-wider">
            <Building className="w-4 h-4" />
            <span>UPDHITE • Central Maintenance Directorate Desk (Office Usage)</span>
          </div>
          <h2 className="text-2xl font-black text-[#172A24] tracking-tight mt-1">
            Campus-Wide Work Tracking & Operations
          </h2>
          <p className="text-xs text-[#697B72] mt-1 font-medium">
            Centralized monitoring of all section offices, worker tasks, schedules, and requisitions across campus.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-3 bg-white hover:bg-[#F8FAF9] text-[#172A24] rounded-2xl border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)] transition disabled:opacity-50"
          title="Refresh works"
        >
          <RefreshCw className={`w-4 h-4 text-[#087A50] ${loading ? 'animate-spin' : ''}`} />
        </button>
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

      {/* SUMMARY KPI CARDS (CLAYMORPHISM) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#697B72] text-[11px] font-bold uppercase tracking-wider">Total Campus Works</div>
          <div className="text-2xl font-black text-[#172A24] mt-1.5">{works.length}</div>
          <div className="text-[11px] text-[#697B72] mt-0.5">All 3 campus sections</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-amber-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending Backlog</span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{pendingWorks.length}</div>
          <div className="text-[11px] text-amber-800/80 mt-0.5">Awaiting completion</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-sky-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>Staff Reached</span>
          </div>
          <div className="text-2xl font-black text-sky-700 mt-1.5">{reachedWorks.length}</div>
          <div className="text-[11px] text-sky-800/80 mt-0.5">Active on location</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-orange-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <PauseCircle className="w-3 h-3 text-orange-600" />
            <span>Postponed Tasks</span>
          </div>
          <div className="text-2xl font-black text-orange-700 mt-1.5">{postponedWorks.length}</div>
          <div className="text-[11px] text-orange-800/80 mt-0.5">Tools or access needed</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#087A50] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#229B68]" />
            <span>Completed Works</span>
          </div>
          <div className="text-2xl font-black text-[#087A50] mt-1.5">{doneWorks.length}</div>
          <div className="text-[11px] text-[#087A50]/80 mt-0.5">Successfully closed</div>
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex items-center gap-2 border-b border-[#DCE8E0] pb-2">
        <button
          onClick={() => setViewTab('works')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewTab === 'works'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Campus Works Directory</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${viewTab === 'works' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {works.length}
          </span>
        </button>

        <button
          onClick={() => setViewTab('requisitions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewTab === 'requisitions'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Tool & Material Requisitions</span>
          {toolRequisitionWorks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-200 text-purple-900 font-bold">
              {toolRequisitionWorks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setViewTab('guest_workers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            viewTab === 'guest_workers'
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Guest Worker Registry</span>
          {guestWorkerWorks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-200 text-indigo-900 font-bold">
              {guestWorkerWorks.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CAMPUS WORKS TABLE WITH IN-APP REMINDER TRIGGER */}
      {viewTab === 'works' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#697B72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search across all sections, tickets, locations, workers..."
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
                <option value="section_1">Section 1</option>
                <option value="section_2">Section 2</option>
                <option value="section_3">Section 3</option>
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
                <option value="done">Completed ({doneWorks.length})</option>
              </select>

              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] capitalize"
              >
                <option value="all">All Trades</option>
                {tradeRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-[#DCE8E0] rounded-3xl overflow-hidden shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#172A24]">
                <thead className="bg-[#F8FAF9] text-[#697B72] uppercase text-[10px] font-bold tracking-wider border-b border-[#DCE8E0]">
                  <tr>
                    <th className="py-3 px-4">Ticket & Section</th>
                    <th className="py-3 px-4">Problem Description & Location</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Assigned Worker</th>
                    <th className="py-3 px-4">Status & Details</th>
                    <th className="py-3 px-4 text-right">In-App Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2ED]">
                  {filteredWorks.map((w) => (
                    <tr key={w.id} className="hover:bg-[#F8FAF9]/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#087A50] text-xs">
                          {w.ticketNumber}
                        </div>
                        <div className="text-[11px] font-semibold text-[#172A24] mt-0.5">
                          {w.sectionName || w.sectionId}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E4F2E9] text-[#075B40] border border-[#D2E4D8] capitalize">
                            {w.isGuestWorker ? '★ Guest' : w.workerRole.replace('_', ' ')}
                          </span>
                          {w.urgency === 'urgent' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                              URGENT
                            </span>
                          )}
                        </div>
                      </td>

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
                                  <span className="font-bold">Cause:</span> {w.postponeCause}
                                </div>
                              )}
                              {w.neededTools && (
                                <div className="font-bold text-purple-700 flex items-center gap-1">
                                  <Wrench className="w-3 h-3" />
                                  <span>Tools Requisition: {w.neededTools}</span>
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
                          <span className="text-[#697B72] italic text-xs">Standard priority</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#172A24] text-xs">{w.assignedWorkerName}</div>
                        {w.assignedWorkerPhone ? (
                          <div className="text-[11px] text-[#697B72] font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#087A50]" />
                            <span>{w.assignedWorkerPhone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#697B72]/60">No contact provided</span>
                        )}
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

                      {/* IN-APP REMINDER BUTTON */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {w.status !== 'done' ? (
                          <button
                            onClick={() => handleSendReminder(w)}
                            disabled={remindingWorkId === w.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-[0_3px_8px_rgba(231,162,59,0.3)] active:translate-y-0.5 transition disabled:opacity-50"
                            title="Send In-App Reminder directly to worker window"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>
                              {remindingWorkId === w.id ? 'Sending...' : 'Send Reminder'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#087A50] font-bold flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOOL & MATERIAL REQUISITIONS */}
      {viewTab === 'requisitions' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172A24]">
                Tool & Material Requisitions from Field Workers
              </h3>
              <p className="text-xs text-[#697B72]">
                These tasks were postponed by workers requiring specific materials (fans, lights, tools) to complete campus work.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200">
              {toolRequisitionWorks.length} requisitions active
            </span>
          </div>

          {toolRequisitionWorks.length === 0 ? (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl p-12 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-[#087A50] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#172A24]">No pending tool requisitions</p>
              <p className="text-xs text-[#697B72] mt-0.5">
                All field tasks have sufficient materials.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolRequisitionWorks.map((rw) => (
                <div
                  key={rw.id}
                  className="bg-white border border-purple-200 rounded-3xl p-5 shadow-[0_6px_16px_rgba(147,51,234,0.06)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#087A50]">
                      {rw.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                      MATERIAL REQUISITION
                    </span>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                      Required Materials / Tools:
                    </span>
                    <p className="text-sm font-bold text-purple-950 mt-0.5">
                      {rw.neededTools}
                    </p>
                  </div>

                  <div className="text-xs text-[#172A24] space-y-1">
                    <div>
                      <span className="font-semibold text-[#697B72]">Task:</span> {rw.problemDescription}
                    </div>
                    <div className="flex items-center gap-1 text-[#087A50]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{rw.campusLocation}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#697B72]">Assigned Worker:</span> {rw.assignedWorkerName} ({rw.workerRole})
                    </div>
                    <div>
                      <span className="font-semibold text-[#697B72]">Originating Section:</span> {rw.sectionName || rw.sectionId}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#DCE8E0] flex items-center justify-end">
                    <button
                      onClick={() => handleSendReminder(rw)}
                      className="px-3 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B40] text-white text-xs font-semibold shadow-sm transition"
                    >
                      Remind Worker Once Procured
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GUEST WORKER REGISTRY */}
      {viewTab === 'guest_workers' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172A24]">
                Guest Worker / External Contractor Registry
              </h3>
              <p className="text-xs text-[#697B72]">
                External technicians and contractors assigned by section offices requiring central campus entry coordination.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200">
              {guestWorkerWorks.length} guest assignments
            </span>
          </div>

          {guestWorkerWorks.length === 0 ? (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl p-12 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-[#087A50] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#172A24]">No external guest workers currently dispatched</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guestWorkerWorks.map((gw) => (
                <div
                  key={gw.id}
                  className="bg-white border border-indigo-200 rounded-3xl p-5 shadow-[0_6px_16px_rgba(99,102,241,0.06)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#087A50]">
                      {gw.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                      ★ GUEST WORKER
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                      External Technician / Agency:
                    </span>
                    <p className="text-sm font-bold text-indigo-950 mt-0.5">
                      {gw.assignedWorkerName}
                    </p>
                    {gw.assignedWorkerPhone && (
                      <p className="text-xs font-mono text-indigo-800 mt-0.5">
                        Contact: {gw.assignedWorkerPhone}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-[#172A24] space-y-1">
                    <div>
                      <span className="font-semibold text-[#697B72]">Task:</span> {gw.problemDescription}
                    </div>
                    <div className="flex items-center gap-1 text-[#087A50]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{gw.campusLocation}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#697B72]">Assigned by:</span> {gw.sectionName || gw.sectionId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
