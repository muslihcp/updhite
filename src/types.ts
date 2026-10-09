export type Role =
  | 'main_admin'
  | 'office_usage'
  | 'section_office'
  | 'cleaner'
  | 'plumber'
  | 'electrician'
  | string;

export type UserCategory = 'office_usage' | 'worker_usage' | 'admin';

export type WorkerRole =
  | 'cleaner'
  | 'plumber'
  | 'electrician'
  | 'guest_worker'
  | string;

export type SectionId = 'section_1' | 'section_2' | 'section_3';

export type WorkStatus = 'pending' | 'reached' | 'postponed' | 'done';

export type Urgency = 'regular' | 'urgent';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  category?: UserCategory;
  sectionId?: SectionId; // Required if role is section_office
  sectionCustomName?: string;
  phoneNumber?: string;
  createdAt: string;
}

export interface SectionConfig {
  id: SectionId;
  name: string;
  code: string;
  contactNumber: string;
  description: string;
}

export interface WorkRequest {
  id: string;
  ticketNumber: string;
  sectionId: SectionId;
  sectionName?: string;
  problemDescription: string;
  campusLocation: string;
  workerRole: WorkerRole;
  isGuestWorker?: boolean;
  urgency: Urgency;
  scheduleDate?: string;
  scheduleTime?: string;
  assignedWorkerId: string;
  assignedWorkerName: string;
  assignedWorkerPhone: string;
  sectionContactNumber: string;
  status: WorkStatus;
  reachedAt?: string;
  postponedAt?: string;
  postponeCause?: string;
  neededTools?: string;
  createdByUserId: string;
  createdByUsername: string;
  createdAt: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByUsername?: string;
  notes?: string;
}

export type MessageDeliveryStatus = 'DELIVERED' | 'FAILED' | 'UNCONFIGURED_PROVIDER';

export interface MessageLog {
  id: string;
  type:
    | 'work_assigned'
    | 'work_done'
    | 'reminder'
    | 'work_reached'
    | 'work_postponed'
    | 'tools_required'
    | 'guest_worker_assigned';
  workId: string;
  ticketNumber: string;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  messageText: string;
  status: MessageDeliveryStatus;
  provider: 'twilio' | 'whatsapp' | 'sms_gateway' | 'none';
  providerMessageId?: string;
  statusDetails: string;
  timestamp: string;
}

export interface MessagingConfigStatus {
  isConfigured: boolean;
  providerName: string;
  twilioSidSet: boolean;
  twilioTokenSet: boolean;
  twilioPhoneSet: boolean;
  whatsappSenderSet: boolean;
  gatewayUrlSet: boolean;
  notice: string;
}

export interface AppNotification {
  id: string;
  type:
    | 'work_assigned'
    | 'work_done'
    | 'reminder'
    | 'work_reached'
    | 'work_postponed'
    | 'tools_required'
    | 'guest_worker_assigned';
  title: string;
  message: string;
  workId?: string;
  ticketNumber?: string;
  targetRole?: Role;
  targetUserId?: string;
  targetSectionId?: SectionId;
  fromName: string;
  fromRole?: string;
  readByUserIds: string[];
  createdAt: string;
  urgency?: Urgency;
  metadata?: {
    cause?: string;
    neededTools?: string;
    campusLocation?: string;
    scheduleDate?: string;
    scheduleTime?: string;
  };
}

export interface AuthSession {
  user: User;
  token: string;
}
