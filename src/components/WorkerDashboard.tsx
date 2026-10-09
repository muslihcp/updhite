import React, { useState, useEffect } from 'react';
import type { User, WorkRequest, AppNotification } from '../types.ts';
import {
  fetchWorks,
  markWorkDone,
  markWorkReached,
  postponeWork,
  fetchNotifications,
  markNotificationRead,
} from '../api.ts';
import {
  Wrench,
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  RefreshCw,
  Send,
  Check,
  Calendar,
  MapPin,
  PauseCircle,
  PackagePlus,
  Play,
  X,
  Bell,
  ArrowRight,
} from 'lucide-react';

interface WorkerDashboardProps {
  currentUser: User;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentUser }) => {
  const [works, setWorks] = useState<WorkRequest[]>([]);
  const [reminders, setReminders] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Tab: active works vs completed history
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Mark done dialog
  const [completingWork, setCompletingWork] = useState<WorkRequest | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingDone, setSubmittingDone] = useState(false);

  // Reached in progress
  const [submittingReachedId, setSubmittingReachedId] = useState<string | null>(null);

  // Postpone dialog
  const [postponingWork, setPostponingWork] = useState<WorkRequest | null>(null);
  const [postponeCause, setPostponeCause] = useState('');
  const [hasNeededTools, setHasNeededTools] = useState(false);
  const [neededToolsInput, setNeededToolsInput] = useState('');
  const [postponeRescheduleDate, setPostponeRescheduleDate] = useState('');
  const [submittingPostpone, setSubmittingPostpone] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wList, notifs] = await Promise.all([fetchWorks(), fetchNotifications()]);
      setWorks(wList.filter((w) => w.assignedWorkerId === currentUser.id));

      // Filter unread reminders or assignments targeted to this worker
      const myReminders = notifs.filter(
        (n) =>
          n.targetUserId === currentUser.id &&
          !n.readByUserIds?.includes(currentUser.id)
      );
      setReminders(myReminders);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned works.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // 4-second poll for real-time office reminders
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Mark as Reached (Arrived on site)
  const handleMarkReached = async (work: WorkRequest) => {
    try {
      setSubmittingReachedId(work.id);
      setError(null);
      await markWorkReached(work.id);
      setSuccessNotice(`Ticket ${work.ticketNumber}: You are marked as REACHED on site at ${work.campusLocation}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update reached status.');
    } finally {
      setSubmittingReachedId(null);
    }
  };

  // Open postpone dialog
  const handleOpenPostpone = (work: WorkRequest) => {
    setPostponingWork(work);
    setPostponeCause(work.postponeCause || '');
    setHasNeededTools(!!work.neededTools);
    setNeededToolsInput(work.neededTools || '');
    setPostponeRescheduleDate(work.scheduleDate || '');
  };

  // Submit postpone
  const handleConfirmPostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponingWork) return;

    if (!postponeCause.trim()) {
      setError('Please provide the cause/reason for postponing this task.');
      return;
    }

    try {
      setSubmittingPostpone(true);
      setError(null);
      await postponeWork(postponingWork.id, {
        cause: postponeCause.trim(),
        neededTools: hasNeededTools ? neededToolsInput.trim() : undefined,
        scheduleDate: postponeRescheduleDate.trim() || undefined,
      });

      const toolsText = hasNeededTools && neededToolsInput.trim() ? ' & tools requested forwarded to Office Usage' : '';
      setSuccessNotice(`Ticket ${postponingWork.ticketNumber} postponed. Section Office notified${toolsText}.`);

      setPostponingWork(null);
      setPostponeCause('');
      setHasNeededTools(false);
      setNeededToolsInput('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to postpone work.');
    } finally {
      setSubmittingPostpone(false);
    }
  };

  // Submit Done
  const handleConfirmDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingWork) return;

    try {
      setSubmittingDone(true);
      setError(null);
      const res = await markWorkDone(completingWork.id, completionNotes.trim() || undefined);

      setSuccessNotice(
        `Ticket ${res.work.ticketNumber} marked DONE! Completion notice dispatched to Section Office.`
      );

      setCompletingWork(null);
      setCompletionNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete work.');
    } finally {
      setSubmittingDone(false);
    }
  };

  const handleAcknowledgeReminder = async (id: string) => {
    try {
      await markNotificationRead(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const activeWorks = works.filter((w) => w.status !== 'done');
  const urgentActiveWorks = activeWorks.filter((w) => w.urgency === 'urgent');
  const completedWorks = works.filter((w) => w.status === 'done');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* WORKER PROFILE BANNER CARD */}
      <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087A50] text-xs font-bold uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            <span>Field Staff Work Console • {currentUser.role.replace('_', ' ').toUpperCase()}</span>
          </div>
          <h2 className="text-2xl font-black text-[#172A24] tracking-tight mt-1">
            {currentUser.fullName}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#697B72]">
            <span className="font-mono bg-[#E4F2E9] text-[#075B40] px-2 py-0.5 rounded-md font-bold">
              @{currentUser.username}
            </span>
            {currentUser.phoneNumber && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#087A50]" />
                <span>{currentUser.phoneNumber}</span>
              </span>
            )}
            <span>•</span>
            <span className="font-medium text-[#172A24]">
              {activeWorks.length} active assignments on campus
            </span>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-3 bg-white hover:bg-[#F8FAF9] text-[#172A24] rounded-2xl border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)] transition disabled:opacity-50 ml-auto"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 text-[#087A50] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* OFFICE REMINDERS / URGENT NOTICES SECTION ON WORKER'S WINDOW */}
      {reminders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            <span>Direct In-App Reminders from Office Directorate ({reminders.length})</span>
          </div>
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-[0_4px_12px_rgba(231,162,59,0.12)] flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                      OFFICE REMINDER
                    </span>
                    {rem.ticketNumber && (
                      <span className="font-mono font-bold text-amber-900 text-xs">
                        {rem.ticketNumber}
                      </span>
                    )}
                    <span className="text-[11px] text-amber-700 font-medium">from {rem.fromName}</span>
                  </div>
                  <p className="text-xs font-semibold text-amber-950 mt-1 leading-snug">
                    {rem.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAcknowledgeReminder(rem.id)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Acknowledge Notice</span>
              </button>
            </div>
          ))}
        </div>
      )}

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

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#697B72] text-[11px] font-bold uppercase tracking-wider">Active Campus Tasks</div>
          <div className="text-3xl font-black text-[#172A24] mt-1">{activeWorks.length}</div>
          <div className="text-[11px] text-[#697B72] mt-0.5">Assigned specifically to you</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-red-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span>Urgent Tasks</span>
          </div>
          <div className="text-3xl font-black text-red-700 mt-1">{urgentActiveWorks.length}</div>
          <div className="text-[11px] text-red-700/80 mt-0.5">Priority attention required</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#087A50] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#229B68]" />
            <span>Completed History</span>
          </div>
          <div className="text-3xl font-black text-[#087A50] mt-1">{completedWorks.length}</div>
          <div className="text-[11px] text-[#087A50]/80 mt-0.5">Resolved tasks</div>
        </div>
      </div>

      {/* TABS: ACTIVE VS COMPLETED */}
      <div className="flex items-center gap-2 border-b border-[#DCE8E0] pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <span>Active Tasks</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {activeWorks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-[#087A50] text-white shadow-sm'
              : 'text-[#697B72] hover:text-[#172A24] bg-white border border-[#DCE8E0]'
          }`}
        >
          <span>Completed History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#697B72]'}`}>
            {completedWorks.length}
          </span>
        </button>
      </div>

      {/* ACTIVE TASKS LIST */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeWorks.length === 0 ? (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#E4F2E9] text-[#087A50] mx-auto flex items-center justify-center mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#172A24]">All Caught Up!</h3>
              <p className="text-xs text-[#697B72] mt-1 max-w-sm mx-auto">
                You have no active pending tasks right now. Any newly assigned campus maintenance tickets will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorks.map((work) => {
                const isPending = work.status === 'pending';
                const isReached = work.status === 'reached';
                const isPostponed = work.status === 'postponed';

                return (
                  <div
                    key={work.id}
                    className="bg-white border border-[#DCE8E0] rounded-3xl p-5 shadow-[0_8px_20px_rgba(29,67,48,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col justify-between transition hover:shadow-[0_12px_28px_rgba(29,67,48,0.09)]"
                  >
                    <div>
                      {/* Ticket Header & Status Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#087A50]">
                              {work.ticketNumber}
                            </span>
                            {work.urgency === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                                URGENT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#697B72] font-semibold flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-[#087A50]" />
                            <span>Origin: {work.sectionName || work.sectionId}</span>
                          </span>
                        </div>

                        <div>
                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-sm">
                              <Clock className="w-3 h-3 text-amber-600" />
                              PENDING ARRIVAL
                            </span>
                          )}
                          {isReached && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1 shadow-sm">
                              <MapPin className="w-3 h-3 text-sky-600" />
                              ON SITE (REACHED)
                            </span>
                          )}
                          {isPostponed && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 shadow-sm">
                              <PauseCircle className="w-3 h-3 text-orange-600" />
                              POSTPONED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Problem & Location */}
                      <div className="space-y-2 mb-4 bg-[#F8FAF9] p-3.5 rounded-2xl border border-[#DCE8E0]">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#697B72] block">
                            Work Required:
                          </span>
                          <h4 className="text-sm font-bold text-[#172A24] leading-snug">
                            {work.problemDescription}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-[#087A50] font-semibold">
                          <MapPin className="w-4 h-4 shrink-0 text-[#087A50]" />
                          <span>{work.campusLocation}</span>
                        </div>

                        {work.scheduleDate && (
                          <div className="flex items-center gap-1.5 text-xs text-[#172A24] font-medium pt-1 border-t border-[#DCE8E0]/60">
                            <Calendar className="w-3.5 h-3.5 text-[#087A50]" />
                            <span>
                              Scheduled: <strong>{work.scheduleDate}</strong>
                              {work.scheduleTime ? ` (${work.scheduleTime})` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Postponement notice if postponed */}
                      {isPostponed && (
                        <div className="mb-4 p-3 rounded-2xl bg-orange-50 border border-orange-200 text-orange-950 text-xs space-y-1.5 shadow-sm">
                          <div className="font-semibold text-orange-900 flex items-center gap-1.5">
                            <PauseCircle className="w-4 h-4 text-orange-600" />
                            <span>Postponed Reason: "{work.postponeCause}"</span>
                          </div>
                          {work.neededTools && (
                            <div className="text-[11px] font-bold text-purple-800 bg-purple-50 p-2 rounded-xl border border-purple-200 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Required Tools: {work.neededTools}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACTION WORKFLOW BUTTONS */}
                    <div className="pt-3 border-t border-[#DCE8E0] space-y-2">
                      {/* Step 1: When pending -> REACHED option */}
                      {isPending && (
                        <button
                          onClick={() => handleMarkReached(work)}
                          disabled={submittingReachedId === work.id}
                          className="w-full py-2.5 px-4 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(56,189,248,0.3)] active:translate-y-0.5 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {submittingReachedId === work.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              <span>Mark as Reached on Site</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Step 2: When reached or postponed -> MARK AS DONE or POSTPONE */}
                      {(isReached || isPostponed) && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setCompletingWork(work)}
                            className="py-2.5 px-3 bg-gradient-to-b from-[#098859] via-[#087A50] to-[#075B40] hover:from-[#0a9663] hover:to-[#064f37] text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(8,122,80,0.3)] active:translate-y-0.5 transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark as Done</span>
                          </button>

                          <button
                            onClick={() => handleOpenPostpone(work)}
                            className="py-2.5 px-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-300 rounded-xl text-xs font-bold shadow-[0_2px_6px_rgba(231,162,59,0.12)] active:translate-y-0.5 transition flex items-center justify-center gap-1.5"
                          >
                            <PauseCircle className="w-4 h-4 text-orange-600" />
                            <span>Postpone Work</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED TASKS HISTORY */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedWorks.length === 0 ? (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl p-12 text-center shadow-sm">
              <p className="text-xs text-[#697B72]">No completed tasks on record yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#DCE8E0] rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-[#172A24]">
                <thead className="bg-[#F8FAF9] text-[#697B72] uppercase text-[10px] font-bold tracking-wider border-b border-[#DCE8E0]">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Problem & Location</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Completion Note</th>
                    <th className="py-3 px-4">Completed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2ED]">
                  {completedWorks.map((cw) => (
                    <tr key={cw.id} className="hover:bg-[#F8FAF9]/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#087A50]">
                        {cw.ticketNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172A24]">{cw.problemDescription}</div>
                        <div className="text-[11px] text-[#697B72] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#087A50]" />
                          <span>{cw.campusLocation}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#172A24]">
                        {cw.sectionName || cw.sectionId}
                      </td>
                      <td className="py-3.5 px-4 italic text-[#697B72]">
                        {cw.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#697B72] whitespace-nowrap">
                        {cw.completedAt
                          ? new Date(cw.completedAt).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MARK AS DONE DIALOG */}
      {completingWork && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E4F2E9] text-[#087A50] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172A24]">Mark Work as Completed</h3>
                  <span className="font-mono text-xs font-bold text-[#087A50]">
                    {completingWork.ticketNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCompletingWork(null)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Completion Remarks / Work Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Fan motor rewound, switch replaced and tested operational..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setCompletingWork(null)}
                  className="px-4 py-2 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDone}
                  className="px-5 py-2 bg-[#087A50] hover:bg-[#075B40] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingDone ? (
                    <span>Confirming...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Done</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSTPONE DIALOG WITH CAUSE & OPTIONAL NEW TOOLS */}
      {postponingWork && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <PauseCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172A24]">Postpone Campus Work</h3>
                  <span className="font-mono text-xs font-bold text-[#087A50]">
                    {postponingWork.ticketNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPostponingWork(null)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPostpone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Cause for Postponing *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="State reason (e.g. Room locked, electrical supply cutoff, ladder required...)"
                  value={postponeCause}
                  onChange={(e) => setPostponeCause(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Reschedule Date (Optional)
                </label>
                <input
                  type="date"
                  value={postponeRescheduleDate}
                  onChange={(e) => setPostponeRescheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              {/* OPTIONAL NEW NEEDED TOOLS / MATERIALS */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="needToolsCheckbox"
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      id="needToolsCheckbox"
                      type="checkbox"
                      checked={hasNeededTools}
                      onChange={(e) => setHasNeededTools(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                    />
                    <span className="text-xs font-bold text-purple-900">
                      New Requirement Tools Needed? (Optional)
                    </span>
                  </label>
                </div>

                {hasNeededTools && (
                  <div className="pt-1 space-y-1 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-purple-800">
                      Specify Required Tools / Materials:
                    </label>
                    <input
                      type="text"
                      required={hasNeededTools}
                      placeholder="e.g. Fan, light tube, 16A switch, scaffold..."
                      value={neededToolsInput}
                      onChange={(e) => setNeededToolsInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-purple-300 rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                    <p className="text-[10px] text-purple-700 leading-tight">
                      An in-app requisition notice will be delivered directly to the Office Usage Desk for procurement.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setPostponingWork(null)}
                  className="px-4 py-2 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPostpone}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingPostpone ? (
                    <span>Postponing...</span>
                  ) : (
                    <>
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Confirm Postpone</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
