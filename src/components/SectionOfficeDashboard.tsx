import React, { useState, useEffect } from 'react';
import type { User, WorkRequest, SectionConfig, WorkerRole, Urgency, SectionId } from '../types.ts';
import { fetchWorks, createWork, fetchSections, fetchWorkers, updateSection } from '../api.ts';
import {
  Building2,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  Sparkles,
  Zap,
  Phone,
  RefreshCw,
  Search,
  Filter,
  Check,
  Send,
  Calendar,
  Edit3,
  MapPin,
  PauseCircle,
  X,
  UserCheck,
  Users,
} from 'lucide-react';

interface SectionOfficeDashboardProps {
  currentUser: User;
}

export const SectionOfficeDashboard: React.FC<SectionOfficeDashboardProps> = ({ currentUser }) => {
  const [works, setWorks] = useState<WorkRequest[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [workers, setWorkers] = useState<(User & { pendingCount: number })[]>([]);
  const [workerRoles, setWorkerRoles] = useState<string[]>(['cleaner', 'plumber', 'electrician']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New Work Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');
  const [campusLocation, setCampusLocation] = useState('');
  const [workerRole, setWorkerRole] = useState<string>('electrician');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [workerNameInput, setWorkerNameInput] = useState<string>('');
  const [workerPhoneInput, setWorkerPhoneInput] = useState<string>('');
  const [urgency, setUrgency] = useState<Urgency>('regular');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Section name editing
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [sectionCustomName, setSectionCustomName] = useState('');
  const [sectionContactPhone, setSectionContactPhone] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reached' | 'postponed' | 'done'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'regular'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSectionId = currentUser.sectionId as SectionId;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wList, sList, wkList, rList] = await Promise.all([
        fetchWorks(),
        fetchSections(),
        fetchWorkers(),
        import('../api.ts').then((m) => m.fetchWorkerRoles()).catch(() => ['cleaner', 'plumber', 'electrician']),
      ]);
      setWorks(wList);
      setSections(sList);
      setWorkers(wkList);
      const combinedRoles = Array.from(new Set([...(rList || []), ...wkList.map((w) => w.role)]));
      setWorkerRoles(combinedRoles.length > 0 ? combinedRoles : ['cleaner', 'plumber', 'electrician']);
      if (!workerRole && combinedRoles.length > 0) {
        setWorkerRole(combinedRoles[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load section works.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Current section details
  const currentSection = sections.find((s) => s.id === currentSectionId);

  // Filter workers created by main admin matching chosen trade
  const availableWorkersForRole =
    workerRole === 'guest_worker'
      ? workers
      : workers.filter((w) => w.role.toLowerCase() === workerRole.toLowerCase());

  const handleTradeChange = (newRole: string) => {
    setWorkerRole(newRole);
    if (newRole === 'guest_worker') {
      setSelectedWorkerId('');
      setWorkerNameInput('');
      setWorkerPhoneInput('');
    } else {
      // Auto-select first matching worker if exists
      const match = workers.find((w) => w.role.toLowerCase() === newRole.toLowerCase());
      if (match) {
        setSelectedWorkerId(match.id);
        setWorkerNameInput(match.fullName);
        setWorkerPhoneInput(match.phoneNumber || '');
      } else {
        setSelectedWorkerId('');
        setWorkerNameInput('');
        setWorkerPhoneInput('');
      }
    }
  };

  const handleSelectFieldWorker = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedWorkerId(id);
    const found = workers.find((w) => w.id === id);
    if (found) {
      setWorkerNameInput(found.fullName);
      setWorkerPhoneInput(found.phoneNumber || '');
    } else {
      setWorkerNameInput('');
      setWorkerPhoneInput('');
    }
  };

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim() || !campusLocation.trim()) {
      setError('Please provide both the problem description and the campus location.');
      return;
    }

    if (!workerNameInput.trim()) {
      setError('Please select or enter the field worker.');
      return;
    }

    const isGuest = workerRole === 'guest_worker';

    try {
      setSubmitting(true);
      setError(null);

      const res = await createWork({
        problemDescription: problemDescription.trim(),
        campusLocation: campusLocation.trim(),
        workerRole,
        isGuestWorker: isGuest,
        urgency,
        scheduleDate: scheduleDate ? scheduleDate.trim() : undefined,
        scheduleTime: scheduleTime ? scheduleTime.trim() : undefined,
        assignedWorkerId: selectedWorkerId || undefined,
        assignedWorkerName: workerNameInput.trim(),
        assignedWorkerPhone: workerPhoneInput.trim() || undefined,
        sectionId: currentSectionId,
      });

      const guestAlertNotice = isGuest ? ' • Central Directorate notified of Guest Worker assignment' : '';
      setSuccessNotice(
        `Ticket ${res.work.ticketNumber} created & assigned to ${res.work.assignedWorkerName}! In-app notification delivered${guestAlertNotice}.`
      );

      // Reset form
      setProblemDescription('');
      setCampusLocation('');
      setWorkerNameInput('');
      setWorkerPhoneInput('');
      setSelectedWorkerId('');
      setScheduleDate('');
      setScheduleTime('');
      setUrgency('regular');
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to report work request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSectionDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSection(currentSectionId, {
        name: sectionCustomName.trim() || undefined,
        contactNumber: sectionContactPhone.trim(),
      });
      setSuccessNotice('Section details updated successfully.');
      setShowEditSectionModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update section details.');
    }
  };

  const pendingWorks = works.filter((w) => w.status === 'pending');
  const reachedWorks = works.filter((w) => w.status === 'reached');
  const postponedWorks = works.filter((w) => w.status === 'postponed');
  const doneWorks = works.filter((w) => w.status === 'done');

  const filteredWorks = works.filter((w) => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && w.urgency !== urgencyFilter) return false;
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
      
      {/* SECTION BANNER CARD */}
      <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08),0_4px_6px_-2px_rgba(29,67,48,0.04)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#087A50] text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Designated Campus Section Office: {currentSection?.code || 'SEC'}</span>
          </div>
          <h2 className="text-2xl font-black text-[#172A24] tracking-tight mt-1">
            {currentSection?.name || 'Section Office'} Console
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#697B72]">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-[#087A50]" />
              <span>Office Contact Phone:</span>
              <span className="font-mono text-[#172A24] font-bold">
                {currentSection?.contactNumber || 'Not configured'}
              </span>
            </span>
            <span>•</span>
            <button
              onClick={() => {
                setSectionCustomName(currentSection?.name || '');
                setSectionContactPhone(currentSection?.contactNumber || '');
                setShowEditSectionModal(true);
              }}
              className="text-[#087A50] hover:text-[#075B40] font-semibold underline flex items-center gap-1 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Customize Section Name & Phone</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-b from-[#098859] via-[#087A50] to-[#075B40] hover:from-[#0a9663] hover:to-[#064f37] text-white rounded-2xl text-xs font-bold shadow-[0_6px_16px_rgba(8,122,80,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] active:translate-y-0.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Assign Work & Add Schedule</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-white hover:bg-[#F8FAF9] text-[#172A24] rounded-2xl border border-[#DCE8E0] shadow-[0_2px_6px_rgba(29,67,48,0.06)] transition disabled:opacity-50"
            title="Refresh works"
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

      {/* KPI COUNTER CARDS (CLAYMORPHISM) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#697B72] text-[11px] font-bold uppercase tracking-wider">Total Section Works</div>
          <div className="text-2xl font-black text-[#172A24] mt-1.5">{works.length}</div>
          <div className="text-[11px] text-[#697B72] mt-0.5">Assigned from this wing</div>
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
            <span>Staff Reached</span>
          </div>
          <div className="text-2xl font-black text-sky-700 mt-1.5">{reachedWorks.length}</div>
          <div className="text-[11px] text-sky-800/80 mt-0.5">Actively on site</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-orange-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <PauseCircle className="w-3 h-3 text-orange-600" />
            <span>Postponed</span>
          </div>
          <div className="text-2xl font-black text-orange-700 mt-1.5">{postponedWorks.length}</div>
          <div className="text-[11px] text-orange-800/80 mt-0.5">Reason / tools noted</div>
        </div>

        <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
          <div className="text-[#087A50] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#229B68]" />
            <span>Completed</span>
          </div>
          <div className="text-2xl font-black text-[#087A50] mt-1.5">{doneWorks.length}</div>
          <div className="text-[11px] text-[#087A50]/80 mt-0.5">Resolved tasks</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-[#DCE8E0] rounded-2xl p-4 shadow-[0_4px_12px_rgba(29,67,48,0.05)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#697B72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, problem, location, worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
          >
            <option value="all">All Statuses ({works.length})</option>
            <option value="pending">Pending ({pendingWorks.length})</option>
            <option value="reached">Reached on Site ({reachedWorks.length})</option>
            <option value="postponed">Postponed ({postponedWorks.length})</option>
            <option value="done">Completed ({doneWorks.length})</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
          >
            <option value="all">All Urgency</option>
            <option value="urgent">Urgent Only</option>
            <option value="regular">Regular Only</option>
          </select>
        </div>
      </div>

      {/* WORKS TABLE (CLAY CARD CONTAINER) */}
      <div className="bg-white border border-[#DCE8E0] rounded-3xl overflow-hidden shadow-[0_10px_25px_-3px_rgba(29,67,48,0.08)]">
        <div className="p-4 border-b border-[#DCE8E0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#172A24]">
              Campus Work Tickets for {currentSection?.name || 'Section'}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E4F2E9] text-[#087A50] border border-[#D2E4D8]">
              {filteredWorks.length} tickets
            </span>
          </div>
          <span className="text-[11px] text-[#697B72]">
            Isolated to {currentSection?.name || 'this wing'}
          </span>
        </div>

        {filteredWorks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E4F2E9] text-[#087A50] mx-auto flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#172A24]">No works found</h4>
            <p className="text-xs text-[#697B72] mt-1">
              There are currently no tickets matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#172A24]">
              <thead className="bg-[#F8FAF9] text-[#697B72] uppercase text-[10px] font-bold tracking-wider border-b border-[#DCE8E0]">
                <tr>
                  <th className="py-3 px-4">Ticket & Trade</th>
                  <th className="py-3 px-4">Problem Description & Location</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Assigned Worker</th>
                  <th className="py-3 px-4">Status & Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF2ED]">
                {filteredWorks.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F8FAF9]/80 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-[#087A50] text-xs">
                        {w.ticketNumber}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E4F2E9] text-[#075B40] border border-[#D2E4D8] capitalize">
                          {w.isGuestWorker ? '★ Guest Worker' : w.workerRole.replace('_', ' ')}
                        </span>
                        {w.urgency === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                            URGENT
                          </span>
                        )}
                      </div>
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
                          <div className="mt-2 p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-[11px] space-y-1">
                            {w.postponeCause && (
                              <div className="font-medium">
                                <span className="font-bold">Postpone Reason:</span> {w.postponeCause}
                              </div>
                            )}
                            {w.neededTools && (
                              <div className="flex items-center gap-1 font-bold text-purple-700">
                                <Wrench className="w-3 h-3" />
                                <span>Tools/Materials Needed: {w.neededTools}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {w.notes && (
                          <div className="text-[11px] text-[#697B72] italic bg-[#F8FAF9] p-1.5 rounded-lg border border-[#DCE8E0]">
                            Completion Note: "{w.notes}"
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
                        <span className="text-[#697B72] italic text-xs">As soon as possible</span>
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
                        <span className="text-[11px] text-[#697B72]/60">No contact number</span>
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

      {/* CREATE WORK & SCHEDULE MODAL (CLAYMORPHISM) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE8E0] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#E4F2E9] text-[#087A50] flex items-center justify-center shadow-inner font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172A24]">Assign Work & Add Schedule</h3>
                  <p className="text-[11px] text-[#697B72]">
                    Issuing ticket for {currentSection?.name || 'Section Office'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWork} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                  Problem Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the issue (e.g. Fan functioning, Pipe leakage, Broken light...)"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                  Campus Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First floor CHS, Room 204, Library 1st Floor..."
                  value={campusLocation}
                  onChange={(e) => setCampusLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                />
              </div>

              {/* Trade Selection & Worker Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                    Assign to Trade *
                  </label>
                  <select
                    value={workerRole}
                    onChange={(e) => handleTradeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)] capitalize"
                  >
                    {workerRoles.map((r) => (
                      <option key={r} value={r}>
                        {r.replace('_', ' ')}
                      </option>
                    ))}
                    <option value="guest_worker">★ Guest Worker (External Staff)</option>
                  </select>
                </div>

                {/* SELECT OR TYPE FIELD WORKER:
                    - If Trade is EXCEPT Guest Worker: Select from assigned workers of Main Admin
                    - If Trade IS Guest Worker: Type guest worker name! */}
                {workerRole !== 'guest_worker' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                      Select Assigned Field Worker *
                    </label>
                    <select
                      value={selectedWorkerId}
                      onChange={handleSelectFieldWorker}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs font-semibold text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                    >
                      <option value="">-- Choose Registered Worker --</option>
                      {availableWorkersForRole.map((wk) => (
                        <option key={wk.id} value={wk.id}>
                          {wk.fullName} ({wk.role})
                        </option>
                      ))}
                    </select>
                    {availableWorkersForRole.length === 0 && (
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        No registered staff for {workerRole}. Switch trade or create worker in Main Admin.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                      Type Guest Worker / Agency Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Type guest worker or contractor name..."
                      value={workerNameInput}
                      onChange={(e) => {
                        setWorkerNameInput(e.target.value);
                        setSelectedWorkerId('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                    />
                  </div>
                )}
              </div>

              {/* External Contact Phone Number (Kept for external records / notice) */}
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                  Worker Contact Phone (For records & external contact)
                </label>
                <input
                  type="text"
                  placeholder="+91 81368 67930"
                  value={workerPhoneInput}
                  onChange={(e) => setWorkerPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)]"
                />
              </div>

              {/* Guest worker policy note */}
              {workerRole === 'guest_worker' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Guest Worker Coordination:</strong> When assigned to a guest worker, an in-app notice will automatically pop up on the <strong>Office Usage</strong> window to coordinate entry and supervision.
                  </span>
                </div>
              )}

              {/* Scheduling Options */}
              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-[#DCE8E0] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#172A24]">
                  <Calendar className="w-3.5 h-3.5 text-[#087A50]" />
                  <span>Work Schedule Option</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#697B72] mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#697B72] mb-1">
                      Time Slot / Shift
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Morning, 09:30 AM, Post-Asr..."
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                    />
                  </div>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUrgency('regular')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      urgency === 'regular'
                        ? 'bg-[#E4F2E9] border-[#087A50] text-[#075B40] shadow-sm'
                        : 'bg-white border-[#DCE8E0] text-[#697B72] hover:bg-[#F8FAF9]'
                    }`}
                  >
                    Regular Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('urgent')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      urgency === 'urgent'
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                        : 'bg-white border-[#DCE8E0] text-[#697B72] hover:bg-[#F8FAF9]'
                    }`}
                  >
                    Urgent Priority
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-b from-[#098859] via-[#087A50] to-[#075B40] hover:from-[#0a9663] text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(8,122,80,0.3)] active:translate-y-0.5 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Dispatched in-app...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Ticket & Notify Staff</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SECTION DETAILS MODAL */}
      {showEditSectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE8E0] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_20px_50px_rgba(29,67,48,0.18)] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0] mb-4">
              <h3 className="text-base font-bold text-[#172A24]">Customize Section Details</h3>
              <button
                onClick={() => setShowEditSectionModal(false)}
                className="p-1 rounded-xl text-[#697B72] hover:text-[#172A24] hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSectionDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Custom Section Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHS, Degree Wing, Mosque Wing..."
                  value={sectionCustomName}
                  onChange={(e) => setSectionCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1">
                  Office Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 81368 67930"
                  value={sectionContactPhone}
                  onChange={(e) => setSectionContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-xs text-[#172A24] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#DCE8E0]">
                <button
                  type="button"
                  onClick={() => setShowEditSectionModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#DCE8E0] text-xs font-semibold text-[#172A24] hover:bg-[#F8FAF9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#087A50] hover:bg-[#075B40] text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Save Section Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
