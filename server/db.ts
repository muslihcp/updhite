import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Role, SectionConfig, SectionId, User, WorkRequest, MessageLog, WorkerRole, UserCategory, AppNotification } from '../src/types.ts';

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  sections: SectionConfig[];
  works: WorkRequest[];
  messages: MessageLog[];
  notifications: AppNotification[];
  workerRoles: string[];
  nextTicketSeq: number;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function sanitizeUser(u: StoredUser): User {
  const { passwordHash, salt, ...safe } = u;
  return safe;
}

export const DEFAULT_SECTIONS: SectionConfig[] = [
  {
    id: 'section_1',
    name: 'Section Office 1',
    code: 'SEC-1',
    contactNumber: '',
    description: 'Section 1 Campus Area',
  },
  {
    id: 'section_2',
    name: 'Section Office 2',
    code: 'SEC-2',
    contactNumber: '',
    description: 'Section 2 Campus Area',
  },
  {
    id: 'section_3',
    name: 'Section Office 3',
    code: 'SEC-3',
    contactNumber: '',
    description: 'Section 3 Campus Area',
  },
];

export function getInitialSeed(): DatabaseSchema {
  const salt = generateSalt();
  const passwordHash = hashPassword('dhiusiptro', salt);

  const mainAdmin: StoredUser = {
    id: 'usr-admin-main',
    username: 'adminmuslih',
    fullName: 'Main Administrator',
    role: 'main_admin',
    category: 'admin',
    phoneNumber: '+918136867930',
    createdAt: new Date().toISOString(),
    salt,
    passwordHash,
  };

  return {
    users: [mainAdmin],
    sections: DEFAULT_SECTIONS,
    works: [],
    messages: [],
    notifications: [],
    workerRoles: ['cleaner', 'plumber', 'electrician'],
    nextTicketSeq: 101,
  };
}

export function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(raw);
    
    // If the database does not have adminmuslih as the admin, reset to fresh initial seed
    const hasAdminMuslih = parsed.users && parsed.users.some(u => u.username === 'adminmuslih');
    if (!hasAdminMuslih) {
      const fresh = getInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    if (!Array.isArray(parsed.workerRoles)) {
      parsed.workerRoles = ['cleaner', 'plumber', 'electrician'];
    }
    if (!Array.isArray(parsed.notifications)) {
      parsed.notifications = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db.json, generating fresh seed:', err);
    const initial = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export function saveDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const tempFile = path.join(DB_DIR, `db.tmp.${Date.now()}`);
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}
