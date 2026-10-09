import type {
  User,
  WorkRequest,
  SectionConfig,
  MessageLog,
  MessagingConfigStatus,
  WorkerRole,
  Urgency,
  SectionId,
  Role,
  AppNotification,
} from './types.ts';

const TOKEN_KEY = 'dh_work_mgmt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to sign in.');
  }
  setStoredToken(data.token);
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    clearStoredToken();
  }
}

export async function getCurrentUser(): Promise<User> {
  const resp = await fetch('/api/auth/me', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Session expired.');
  }
  return data.user;
}

export async function fetchWorks(): Promise<WorkRequest[]> {
  const resp = await fetch('/api/works', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch works.');
  }
  return data.works;
}

export async function fetchWorkerRoles(): Promise<string[]> {
  const resp = await fetch('/api/worker-roles', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch worker roles.');
  }
  return data.workerRoles;
}

export async function addWorkerRole(roleName: string): Promise<string[]> {
  const resp = await fetch('/api/worker-roles', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ roleName }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to add worker role.');
  }
  return data.workerRoles;
}

export async function createWork(payload: {
  problemDescription: string;
  campusLocation: string;
  workerRole: WorkerRole;
  isGuestWorker?: boolean;
  urgency: Urgency;
  scheduleDate?: string;
  scheduleTime?: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedWorkerPhone?: string;
  sectionId?: SectionId;
}): Promise<{ work: WorkRequest; messagingLog: MessageLog; guestNoticeLog?: MessageLog }> {
  const resp = await fetch('/api/works', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to create work.');
  }
  return data;
}

export async function markWorkReached(workId: string): Promise<{ work: WorkRequest }> {
  const resp = await fetch(`/api/works/${workId}/reached`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to mark work as reached.');
  }
  return data;
}

export async function postponeWork(
  workId: string,
  payload: { cause: string; neededTools?: string; scheduleDate?: string }
): Promise<{ work: WorkRequest; sectionMsgLog?: MessageLog; toolsMsgLog?: MessageLog }> {
  const resp = await fetch(`/api/works/${workId}/postpone`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to postpone work.');
  }
  return data;
}

export async function markWorkDone(
  workId: string,
  notes?: string
): Promise<{ work: WorkRequest; messagingLog: MessageLog }> {
  const resp = await fetch(`/api/works/${workId}/done`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ notes }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to mark work as done.');
  }
  return data;
}

export async function sendWorkerReminder(workId: string): Promise<{ messagingLog: MessageLog }> {
  const resp = await fetch(`/api/works/${workId}/remind`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to send reminder.');
  }
  return data;
}

export async function fetchSections(): Promise<SectionConfig[]> {
  const resp = await fetch('/api/sections', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch sections.');
  }
  return data.sections;
}

export async function updateSection(
  sectionId: string,
  payload: { name?: string; contactNumber?: string; description?: string }
): Promise<void> {
  const resp = await fetch(`/api/sections/${sectionId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to update section.');
  }
}

export async function updateSectionContact(sectionId: string, contactNumber: string): Promise<void> {
  return updateSection(sectionId, { contactNumber });
}

export async function fetchWorkers(): Promise<(User & { pendingCount: number })[]> {
  const resp = await fetch('/api/workers', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch workers.');
  }
  return data.workers;
}

export async function fetchUsers(): Promise<User[]> {
  const resp = await fetch('/api/users', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch users.');
  }
  return data.users;
}

export async function createUser(payload: {
  username: string;
  password: string;
  fullName: string;
  role: Role;
  category?: 'office_usage' | 'worker_usage' | 'admin';
  sectionId?: SectionId;
  sectionCustomName?: string;
  phoneNumber?: string;
}): Promise<User> {
  const resp = await fetch('/api/users', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to create user account.');
  }
  return data.user;
}

export async function fetchMessages(): Promise<MessageLog[]> {
  const resp = await fetch('/api/messages', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch message logs.');
  }
  return data.messages;
}

export async function fetchMessagingConfig(): Promise<MessagingConfigStatus> {
  const resp = await fetch('/api/messaging-config', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch messaging configuration.');
  }
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  const resp = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to delete user.');
  }
}

export async function clearTestData(): Promise<void> {
  const resp = await fetch('/api/clear-test-data', {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to clear test data.');
  }
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const resp = await fetch('/api/notifications', {
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to fetch notifications.');
  }
  return data.notifications || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const resp = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to mark notification as read.');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const resp = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to mark all notifications as read.');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const resp = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to delete notification.');
  }
}

export async function resetSampleData(): Promise<void> {
  const resp = await fetch('/api/reset-sample-data', {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to reset sample data.');
  }
}
