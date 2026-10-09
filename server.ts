import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  loadDb,
  saveDb,
  hashPassword,
  generateSalt,
  verifyPassword,
  sanitizeUser,
  DEFAULT_SECTIONS,
  getInitialSeed,
  type StoredUser,
} from './server/db.ts';
import { dispatchMessage, getMessagingConfigStatus } from './server/messaging.ts';
import type { Role, SectionId, WorkerRole, WorkRequest, Urgency, AppNotification } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory active sessions map (token -> { userId, role, sectionId, createdAt })
interface ActiveSession {
  userId: string;
  role: Role;
  sectionId?: SectionId;
  createdAt: number;
}
const sessions = new Map<string, ActiveSession>();

// Authentication Middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.substring(7).trim();
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
    return;
  }

  const db = loadDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    sessions.delete(token);
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  // Attach user to request
  (req as any).user = sanitizeUser(user);
  (req as any).sessionToken = token;
  next();
}

function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Access denied: You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

// ----------------- AUTHENTICATION APIS -----------------

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const db = loadDb();
  const cleanUsername = String(username).toLowerCase().trim();
  const user = db.users.find((u) => u.username === cleanUsername);

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const isValid = verifyPassword(String(password), user.salt, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  // Issue random cryptographic session token
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    role: user.role,
    sectionId: user.sectionId,
    createdAt: Date.now(),
  });

  res.json({
    token,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticate, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// ----------------- USER MANAGEMENT APIS (Main Admin Only) -----------------

// GET /api/worker-roles (Returns all active worker trades)
app.get('/api/worker-roles', authenticate, (req: Request, res: Response) => {
  const db = loadDb();
  const predefined = db.workerRoles || ['cleaner', 'plumber', 'electrician'];
  const userRoles = db.users
    .filter((u) => u.category === 'worker_usage' || !['main_admin', 'office_usage', 'section_office'].includes(u.role))
    .map((u) => u.role);
  const allRoles = Array.from(new Set([...predefined, ...userRoles]));
  res.json({ workerRoles: allRoles });
});

// POST /api/worker-roles (Main Admin adds new worker trade/role)
app.post('/api/worker-roles', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const { roleName } = req.body;
  if (!roleName || !String(roleName).trim()) {
    res.status(400).json({ error: 'Role name is required.' });
    return;
  }
  const db = loadDb();
  const clean = String(roleName).trim().toLowerCase();
  if (!db.workerRoles) db.workerRoles = ['cleaner', 'plumber', 'electrician'];
  if (!db.workerRoles.includes(clean)) {
    db.workerRoles.push(clean);
    saveDb(db);
  }
  res.status(201).json({ success: true, workerRoles: db.workerRoles });
});

// GET /api/users
app.get('/api/users', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const db = loadDb();
  const safeUsers = db.users.map((u) => sanitizeUser(u));
  res.json({ users: safeUsers });
});

// POST /api/users
app.post('/api/users', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const { username, password, fullName, role, category, sectionId, sectionCustomName, phoneNumber } = req.body;

  if (!username || !password || !fullName || !role) {
    res.status(400).json({ error: 'Username, password, full name, and role are required.' });
    return;
  }

  const cleanRole = String(role).trim().toLowerCase();

  // Validate non-worker roles; worker roles can be any new custom role
  if (category === 'office_usage' || ['main_admin', 'office_usage', 'section_office'].includes(cleanRole)) {
    const validOfficeRoles = ['main_admin', 'office_usage', 'section_office'];
    if (!validOfficeRoles.includes(cleanRole)) {
      res.status(400).json({ error: 'Invalid office role provided.' });
      return;
    }
  }

  if (cleanRole === 'section_office' && !['section_1', 'section_2', 'section_3'].includes(sectionId)) {
    res.status(400).json({ error: 'Section Office users must be assigned to section_1, section_2, or section_3.' });
    return;
  }

  const db = loadDb();
  const cleanUsername = String(username).toLowerCase().trim();

  if (db.users.some((u) => u.username === cleanUsername)) {
    res.status(400).json({ error: `Username "${cleanUsername}" is already in use.` });
    return;
  }

  // Derive category if not explicitly supplied
  let userCategory = category;
  if (!userCategory) {
    if (['main_admin', 'office_usage', 'section_office'].includes(cleanRole)) {
      userCategory = cleanRole === 'main_admin' ? 'admin' : 'office_usage';
    } else {
      userCategory = 'worker_usage';
    }
  }

  // If new worker role, add to system workerRoles
  if (userCategory === 'worker_usage') {
    if (!db.workerRoles) db.workerRoles = ['cleaner', 'plumber', 'electrician'];
    if (!db.workerRoles.includes(cleanRole)) {
      db.workerRoles.push(cleanRole);
    }
  }

  // If sectionCustomName is provided for a section office user, update section name
  if (cleanRole === 'section_office' && sectionId && sectionCustomName && sectionCustomName.trim()) {
    const sec = db.sections.find((s) => s.id === sectionId);
    if (sec) {
      sec.name = sectionCustomName.trim();
    }
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(String(password), salt);

  const newUser: StoredUser = {
    id: `usr-${crypto.randomBytes(6).toString('hex')}`,
    username: cleanUsername,
    fullName: String(fullName).trim(),
    role: cleanRole,
    category: userCategory,
    sectionId: cleanRole === 'section_office' ? sectionId : undefined,
    sectionCustomName: cleanRole === 'section_office' && sectionCustomName ? sectionCustomName.trim() : undefined,
    phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash,
  };

  db.users.push(newUser);
  saveDb(db);

  res.status(201).json({
    message: 'User account created successfully.',
    user: sanitizeUser(newUser),
  });
});

// DELETE /api/users/:userId (Main Admin only)
app.delete('/api/users/:userId', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const { userId } = req.params;
  const db = loadDb();
  const target = db.users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }
  if (target.role === 'main_admin' || target.username === 'adminmuslih') {
    res.status(400).json({ error: 'Cannot delete the primary Main Administrator account.' });
    return;
  }
  db.users = db.users.filter((u) => u.id !== userId);
  saveDb(db);
  res.json({ success: true, message: `User "${target.username}" deleted successfully.` });
});

// POST /api/clear-test-data (Main Admin only)
app.post('/api/clear-test-data', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const fresh = getInitialSeed();
  saveDb(fresh);
  res.json({ success: true, message: 'All test data and sample examples cleared successfully.' });
});

// ----------------- SECTIONS & WORKERS APIS -----------------

// GET /api/sections
app.get('/api/sections', authenticate, (req: Request, res: Response) => {
  const db = loadDb();
  res.json({ sections: db.sections || DEFAULT_SECTIONS });
});

// PUT /api/sections/:sectionId (Main Admin or designated Section Office)
app.put('/api/sections/:sectionId', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { sectionId } = req.params;
  const { name, contactNumber, description } = req.body;

  // Verify authorization
  if (currentUser.role !== 'main_admin') {
    if (currentUser.role !== 'section_office' || currentUser.sectionId !== sectionId) {
      res.status(403).json({ error: 'Unauthorized to modify this section.' });
      return;
    }
  }

  const db = loadDb();
  const section = db.sections.find((s) => s.id === sectionId);
  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  if (name !== undefined && String(name).trim() !== '') {
    section.name = String(name).trim();
  }
  if (contactNumber !== undefined) {
    section.contactNumber = String(contactNumber).trim();
  }
  if (description !== undefined) {
    section.description = String(description).trim();
  }

  saveDb(db);
  res.json({ success: true, section });
});

// GET /api/workers
app.get('/api/workers', authenticate, (req: Request, res: Response) => {
  const db = loadDb();
  const nonWorkerRoles = ['main_admin', 'office_usage', 'section_office'];
  const workerUsers = db.users
    .filter((u) => u.category === 'worker_usage' || !nonWorkerRoles.includes(u.role))
    .map((u) => {
      const activeCount = db.works.filter(
        (w) => w.assignedWorkerId === u.id && ['pending', 'reached', 'postponed'].includes(w.status)
      ).length;
      return {
        ...sanitizeUser(u),
        pendingCount: activeCount,
      };
    });

  res.json({ workers: workerUsers });
});

// ----------------- WORK REQUESTS APIS -----------------

// GET /api/works (Role-based and section-based isolation!)
app.get('/api/works', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const db = loadDb();

  let works: WorkRequest[] = [];

  if (currentUser.role === 'main_admin' || currentUser.role === 'office_usage') {
    // Can view all works across all three sections
    works = db.works;
  } else if (currentUser.role === 'section_office') {
    // Strictly isolate: only works originating from their own designated section!
    works = db.works.filter((w) => w.sectionId === currentUser.sectionId);
  } else {
    // All workers (cleaner, plumber, electrician, and custom trades): only see works assigned to them!
    works = db.works.filter((w) => w.assignedWorkerId === currentUser.id);
  }

  // Sort: pending first, then by urgency (urgent first), then newest
  works.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    if (a.urgency !== b.urgency) {
      return a.urgency === 'urgent' ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ works });
});

// POST /api/works (Create work request - Section Office, Office Usage, or Main Admin)
app.post(
  '/api/works',
  authenticate,
  requireRole(['section_office', 'office_usage', 'main_admin']),
  async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const {
      problemDescription,
      campusLocation,
      workerRole,
      urgency,
      scheduleDate,
      scheduleTime,
      assignedWorkerId,
      assignedWorkerName,
      assignedWorkerPhone,
      sectionId,
    } = req.body;

    if (!problemDescription || !campusLocation || !workerRole) {
      res.status(400).json({ error: 'Problem description, campus location, and worker trade are required.' });
      return;
    }

    const cleanRole = String(workerRole).trim().toLowerCase();
    const isGuest = cleanRole === 'guest_worker' || cleanRole === 'guest worker' || req.body.isGuestWorker === true;

    // Determine target section:
    let targetSectionId: SectionId;
    if (currentUser.role === 'section_office') {
      targetSectionId = currentUser.sectionId!;
    } else {
      if (sectionId && ['section_1', 'section_2', 'section_3'].includes(sectionId)) {
        targetSectionId = sectionId;
      } else {
        targetSectionId = 'section_1';
      }
    }

    const db = loadDb();

    // Determine assigned worker:
    let resolvedWorkerId = assignedWorkerId;
    let resolvedWorkerName = assignedWorkerName ? String(assignedWorkerName).trim() : '';
    let resolvedWorkerPhone = assignedWorkerPhone ? String(assignedWorkerPhone).trim() : '';

    if (assignedWorkerId) {
      const found = db.users.find((u) => u.id === assignedWorkerId);
      if (found) {
        resolvedWorkerId = found.id;
        resolvedWorkerName = found.fullName;
        resolvedWorkerPhone = found.phoneNumber || resolvedWorkerPhone;
      }
    }

    // If still no worker name, try to match by role or typed name
    if (!resolvedWorkerName) {
      const matchByNameOrRole = db.users.find(
        (u) =>
          u.username.toLowerCase() === resolvedWorkerName.toLowerCase() ||
          u.fullName.toLowerCase() === resolvedWorkerName.toLowerCase() ||
          u.role.toLowerCase() === cleanRole
      );
      if (matchByNameOrRole) {
        resolvedWorkerId = matchByNameOrRole.id;
        resolvedWorkerName = matchByNameOrRole.fullName;
        resolvedWorkerPhone = matchByNameOrRole.phoneNumber || '';
      } else if (isGuest) {
        resolvedWorkerId = `guest-${crypto.randomBytes(4).toString('hex')}`;
        resolvedWorkerName = 'Guest Worker (External)';
      } else {
        res.status(400).json({
          error: `Please specify the name of the field worker or select an existing worker.`,
        });
        return;
      }
    }

    if (!resolvedWorkerId) {
      resolvedWorkerId = `worker-${crypto.randomBytes(4).toString('hex')}`;
    }

    const targetSection = db.sections.find((s) => s.id === targetSectionId) || DEFAULT_SECTIONS[0];
    const ticketSeq = db.nextTicketSeq || 101;
    db.nextTicketSeq = ticketSeq + 1;
    const ticketNumber = `DH-2026-${ticketSeq}`;

    const workId = `wrk-${crypto.randomBytes(6).toString('hex')}`;
    const newWork: WorkRequest = {
      id: workId,
      ticketNumber,
      sectionId: targetSectionId,
      sectionName: targetSection.name,
      problemDescription: String(problemDescription).trim(),
      campusLocation: String(campusLocation).trim(),
      workerRole: cleanRole as WorkerRole,
      isGuestWorker: isGuest,
      urgency: urgency === 'urgent' ? 'urgent' : 'regular',
      scheduleDate: scheduleDate ? String(scheduleDate).trim() : undefined,
      scheduleTime: scheduleTime ? String(scheduleTime).trim() : undefined,
      assignedWorkerId: resolvedWorkerId,
      assignedWorkerName: resolvedWorkerName,
      assignedWorkerPhone: resolvedWorkerPhone,
      sectionContactNumber: targetSection.contactNumber || '',
      status: 'pending',
      createdByUserId: currentUser.id,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
    };

    db.works.unshift(newWork);
    if (!Array.isArray(db.notifications)) db.notifications = [];

    // In-App Notification: Notify assigned worker on their window
    const workerNotif: AppNotification = {
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      type: 'work_assigned',
      title: `New Task Assigned (${newWork.ticketNumber})`,
      message: `Assigned by ${targetSection.name}: "${newWork.problemDescription}" at ${newWork.campusLocation}.${newWork.scheduleDate ? ` Scheduled: ${newWork.scheduleDate}` : ''}`,
      workId: newWork.id,
      ticketNumber: newWork.ticketNumber,
      targetUserId: resolvedWorkerId,
      fromName: targetSection.name,
      readByUserIds: [],
      createdAt: new Date().toISOString(),
      urgency: newWork.urgency,
      metadata: {
        campusLocation: newWork.campusLocation,
        scheduleDate: newWork.scheduleDate,
        scheduleTime: newWork.scheduleTime,
      },
    };
    db.notifications.unshift(workerNotif);

    // If assigned to GUEST WORKER: In-App Notify Office Usage user on their window!
    let guestNoticeLog: any = null;
    if (isGuest) {
      const guestNotif: AppNotification = {
        id: `notif-${crypto.randomBytes(6).toString('hex')}`,
        type: 'guest_worker_assigned',
        title: `Guest Worker Notice (${newWork.ticketNumber})`,
        message: `Section "${targetSection.name}" assigned ticket ${newWork.ticketNumber} at ${newWork.campusLocation} to Guest Worker "${resolvedWorkerName}". Problem: "${newWork.problemDescription}". Please track.`,
        workId: newWork.id,
        ticketNumber: newWork.ticketNumber,
        targetRole: 'office_usage',
        fromName: targetSection.name,
        readByUserIds: [],
        createdAt: new Date().toISOString(),
        urgency: newWork.urgency,
        metadata: { campusLocation: newWork.campusLocation },
      };
      db.notifications.unshift(guestNotif);
    }

    saveDb(db);

    res.status(201).json({
      message: 'Work request created and assigned successfully.',
      work: newWork,
      notification: workerNotif,
    });
  }
);

// PATCH /api/works/:id/reached (Worker marks that they arrived/reached on site)
app.patch('/api/works/:id/reached', authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;

  const db = loadDb();
  const work = db.works.find((w) => w.id === id);

  if (!work) {
    res.status(404).json({ error: 'Work request not found.' });
    return;
  }

  // Authorization check: Assigned worker or Main Admin
  if (currentUser.role !== 'main_admin' && work.assignedWorkerId !== currentUser.id) {
    res.status(403).json({ error: 'You are only authorized to update works assigned to you.' });
    return;
  }

  if (work.status === 'done') {
    res.status(400).json({ error: 'This work has already been marked as DONE.' });
    return;
  }

  const reachedAt = new Date().toISOString();
  work.status = 'reached';
  work.reachedAt = reachedAt;

  // In-App Notification: Notify Section Office window
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const reachNotif: AppNotification = {
    id: `notif-${crypto.randomBytes(6).toString('hex')}`,
    type: 'work_reached',
    title: `Staff Reached on Site (${work.ticketNumber})`,
    message: `${currentUser.fullName} arrived on site at ${work.campusLocation} for ticket ${work.ticketNumber}.`,
    workId: work.id,
    ticketNumber: work.ticketNumber,
    targetSectionId: work.sectionId,
    fromName: currentUser.fullName,
    readByUserIds: [],
    createdAt: new Date().toISOString(),
    urgency: work.urgency,
    metadata: { campusLocation: work.campusLocation },
  };
  db.notifications.unshift(reachNotif);

  saveDb(db);

  res.json({
    message: 'Worker marked as reached on site.',
    work,
  });
});

// PATCH /api/works/:id/postpone (Worker postpones task with cause & optional needed tools)
app.patch('/api/works/:id/postpone', authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { cause, neededTools, scheduleDate } = req.body;

  if (!cause || !String(cause).trim()) {
    res.status(400).json({ error: 'Please provide the cause/reason for postponing this task.' });
    return;
  }

  const db = loadDb();
  const work = db.works.find((w) => w.id === id);

  if (!work) {
    res.status(404).json({ error: 'Work request not found.' });
    return;
  }

  if (currentUser.role !== 'main_admin' && work.assignedWorkerId !== currentUser.id) {
    res.status(403).json({ error: 'You are only authorized to postpone works assigned to you.' });
    return;
  }

  if (work.status === 'done') {
    res.status(400).json({ error: 'Cannot postpone an already completed work.' });
    return;
  }

  const postponedAt = new Date().toISOString();
  work.status = 'postponed';
  work.postponedAt = postponedAt;
  work.postponeCause = String(cause).trim();
  if (neededTools && String(neededTools).trim()) {
    work.neededTools = String(neededTools).trim();
  }
  if (scheduleDate && String(scheduleDate).trim()) {
    work.scheduleDate = String(scheduleDate).trim();
  }

  if (!Array.isArray(db.notifications)) db.notifications = [];

  // 1. Notify Section Office window
  const postNotif: AppNotification = {
    id: `notif-${crypto.randomBytes(6).toString('hex')}`,
    type: 'work_postponed',
    title: `Task Postponed (${work.ticketNumber})`,
    message: `${currentUser.fullName} postponed ticket ${work.ticketNumber} at ${work.campusLocation}. Reason: "${work.postponeCause}". ${work.scheduleDate ? `Rescheduled to: ${work.scheduleDate}.` : ''}`,
    workId: work.id,
    ticketNumber: work.ticketNumber,
    targetSectionId: work.sectionId,
    fromName: currentUser.fullName,
    readByUserIds: [],
    createdAt: new Date().toISOString(),
    urgency: work.urgency,
    metadata: {
      cause: work.postponeCause,
      neededTools: work.neededTools,
      campusLocation: work.campusLocation,
      scheduleDate: work.scheduleDate,
    },
  };
  db.notifications.unshift(postNotif);

  // 2. If new tools/materials needed: Notify Office Usage user window!
  if (work.neededTools) {
    const toolsNotif: AppNotification = {
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      type: 'tools_required',
      title: `New Tool/Material Requirement (${work.ticketNumber})`,
      message: `Postponed ticket ${work.ticketNumber} at ${work.campusLocation} (worker: ${currentUser.fullName}) requires: "${work.neededTools}". Originating Section: ${work.sectionName || work.sectionId}.`,
      workId: work.id,
      ticketNumber: work.ticketNumber,
      targetRole: 'office_usage',
      fromName: currentUser.fullName,
      readByUserIds: [],
      createdAt: new Date().toISOString(),
      urgency: work.urgency,
      metadata: {
        cause: work.postponeCause,
        neededTools: work.neededTools,
        campusLocation: work.campusLocation,
      },
    };
    db.notifications.unshift(toolsNotif);
  }

  saveDb(db);

  res.json({
    message: 'Task postponed successfully. In-app notifications dispatched to Section Office and Office Usage.',
    work,
  });
});

// PATCH /api/works/:id/done (Worker marks work as DONE)
app.patch('/api/works/:id/done', authenticate, async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { notes } = req.body;

  const db = loadDb();
  const work = db.works.find((w) => w.id === id);

  if (!work) {
    res.status(404).json({ error: 'Work request not found.' });
    return;
  }

  // Authorization check: Only assigned worker or Main Admin can mark as done
  if (currentUser.role !== 'main_admin' && work.assignedWorkerId !== currentUser.id) {
    res.status(403).json({ error: 'You are only authorized to complete works assigned to you.' });
    return;
  }

  if (work.status === 'done') {
    res.status(400).json({ error: 'This work has already been marked as DONE.' });
    return;
  }

  const completedAt = new Date().toISOString();
  work.status = 'done';
  work.completedAt = completedAt;
  work.completedByUserId = currentUser.id;
  work.completedByUsername = currentUser.username;
  if (notes) {
    work.notes = String(notes).trim();
  }

  // In-App Notification: Notify Section Office & Office Directorate
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const doneNotif: AppNotification = {
    id: `notif-${crypto.randomBytes(6).toString('hex')}`,
    type: 'work_done',
    title: `Work Completed (${work.ticketNumber})`,
    message: `Ticket ${work.ticketNumber} at ${work.campusLocation} has been marked DONE by ${currentUser.fullName} (${work.workerRole}). ${work.notes ? `Note: "${work.notes}".` : ''}`,
    workId: work.id,
    ticketNumber: work.ticketNumber,
    targetSectionId: work.sectionId,
    fromName: currentUser.fullName,
    readByUserIds: [],
    createdAt: new Date().toISOString(),
    urgency: work.urgency,
    metadata: { campusLocation: work.campusLocation },
  };
  db.notifications.unshift(doneNotif);

  saveDb(db);

  res.json({
    message: 'Work status updated to DONE successfully.',
    work,
  });
});

// POST /api/works/:id/remind (Office Usage sends reminder to worker on his window)
app.post(
  '/api/works/:id/remind',
  authenticate,
  requireRole(['office_usage', 'main_admin']),
  async (req: Request, res: Response) => {
    const currentUser = (req as any).user;
    const { id } = req.params;
    const db = loadDb();
    const work = db.works.find((w) => w.id === id);

    if (!work) {
      res.status(404).json({ error: 'Work request not found.' });
      return;
    }

    if (work.status === 'done') {
      res.status(400).json({ error: 'Cannot send reminder for an already completed work.' });
      return;
    }

    const schedNotice = work.scheduleDate ? ` Scheduled: ${work.scheduleDate}.` : '';

    // Direct In-App Notification targeted to the worker's own window!
    const remindNotif: AppNotification = {
      id: `notif-${crypto.randomBytes(6).toString('hex')}`,
      type: 'reminder',
      title: `🚨 Urgent Reminder from Office Desk: ${work.ticketNumber}`,
      message: `Central Maintenance Directorate urges prompt attention for ticket ${work.ticketNumber} at ${work.campusLocation}. Task: "${work.problemDescription}".${schedNotice} Please attend to this task promptly.`,
      workId: work.id,
      ticketNumber: work.ticketNumber,
      targetUserId: work.assignedWorkerId,
      fromName: currentUser.fullName || 'Central Directorate Office Desk',
      fromRole: currentUser.role,
      readByUserIds: [],
      createdAt: new Date().toISOString(),
      urgency: 'urgent',
      metadata: { campusLocation: work.campusLocation, scheduleDate: work.scheduleDate },
    };

    if (!Array.isArray(db.notifications)) db.notifications = [];
    db.notifications.unshift(remindNotif);
    saveDb(db);

    res.json({
      message: `Reminder sent to worker "${work.assignedWorkerName}" directly on their in-app window.`,
      notification: remindNotif,
    });
  }
);

// ----------------- IN-APP NOTIFICATIONS APIS -----------------

// GET /api/notifications (Fetch in-app notifications for currentUser window)
app.get('/api/notifications', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const db = loadDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];

  const userNotifs = db.notifications.filter((n) => {
    if (currentUser.role === 'main_admin') return true;
    if (n.targetUserId && n.targetUserId === currentUser.id) return true;
    if (n.targetRole && n.targetRole === currentUser.role) return true;
    if (currentUser.role === 'section_office' && n.targetSectionId === currentUser.sectionId) return true;
    if (currentUser.role === 'office_usage' && ['tools_required', 'guest_worker_assigned', 'work_done'].includes(n.type)) return true;
    return false;
  });

  userNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: userNotifs });
});

// PATCH /api/notifications/:id/read (Mark a notification as read)
app.patch('/api/notifications/:id/read', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const db = loadDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const notif = db.notifications.find((n) => n.id === id);
  if (notif) {
    if (!Array.isArray(notif.readByUserIds)) notif.readByUserIds = [];
    if (!notif.readByUserIds.includes(currentUser.id)) {
      notif.readByUserIds.push(currentUser.id);
      saveDb(db);
    }
  }
  res.json({ success: true, notification: notif });
});

// POST /api/notifications/mark-all-read (Mark all user's notifications as read)
app.post('/api/notifications/mark-all-read', authenticate, (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const db = loadDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.forEach((n) => {
    if (!Array.isArray(n.readByUserIds)) n.readByUserIds = [];
    if (!n.readByUserIds.includes(currentUser.id)) {
      n.readByUserIds.push(currentUser.id);
    }
  });
  saveDb(db);
  res.json({ success: true });
});

// DELETE /api/notifications/:id (Dismiss/delete a notification)
app.delete('/api/notifications/:id', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications = db.notifications.filter((n) => n.id !== id);
  saveDb(db);
  res.json({ success: true });
});

// ----------------- MESSAGING AUDIT & CONFIG -----------------

// GET /api/messages (Admin and Office Usage only)
app.get('/api/messages', authenticate, requireRole(['main_admin', 'office_usage']), (req: Request, res: Response) => {
  const db = loadDb();
  res.json({ messages: db.messages || [] });
});

// GET /api/messaging-config
app.get('/api/messaging-config', authenticate, (req: Request, res: Response) => {
  const config = getMessagingConfigStatus();
  res.json(config);
});

// POST /api/reset-sample-data (Main Admin only)
app.post('/api/reset-sample-data', authenticate, requireRole(['main_admin']), (req: Request, res: Response) => {
  const fresh = getInitialSeed();
  saveDb(fresh);
  res.json({ success: true, message: 'Campus sample data reset successfully.' });
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Darul Huda Work Management] Server running on http://0.0.0.0:${PORT}`);
    // Initialize DB on boot
    loadDb();
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
