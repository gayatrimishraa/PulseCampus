
import type { Timestamp } from 'firebase/firestore';

// ==========================================
// USER PROFILES
// ==========================================

export type UserRole = 'student' | 'moderator' | 'admin';
export interface PollOptionResult {
  optionId: string;
  count: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  studentId: string;
  role: UserRole;
  authProvider: 'password' | 'google';
  createdAt: Timestamp;
}

// ==========================================
// CAMPUS REPORTS
// ==========================================

export type ReportStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type ReportCategory =
  | 'maintenance'
  | 'cleanliness'
  | 'safety'
  | 'facilities'
  | 'other';

export interface ReportLocation {
  latitude: number;
  longitude: number;
}

export interface CampusReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  createdBy: string;
  buildingId: string | null;
  location: ReportLocation | null;
  status: ReportStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp | null;
}

// ==========================================
// CAMPUS BUILDINGS
// ==========================================

export interface CampusBuilding {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  imageUrl: string | null;
}

// ==========================================
// POLLS
// ==========================================

export type PollStatus =
  | 'draft'
  | 'published'
  | 'under_review'
  | 'removed'
  | 'closed';

export interface PollOption {
  id: string;
  label: string;
}

export interface CampusPoll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  optionIds: string[];
  createdBy: string;
  status: PollStatus;
  startsAt: Timestamp;
  endsAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PollVote {
  userId: string;
  optionId: string;
  createdAt: Timestamp;
}

export interface PollOptionResult {
  optionId: string;
  count: number;
}

export interface PollOptionResult {
  optionId: string;
  count: number;
}
// ==========================================
// NOTIFICATIONS
// ==========================================

export type NotificationType =
  | 'report_update'
  | 'poll'
  | 'announcement'
  | 'system';

export interface CampusNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Timestamp;
  relatedEntityType: 'report' | 'poll' | null;
  relatedEntityId: string | null;
}

// ==========================================
// MODERATION
// ==========================================

export type ModerationAction =
  | 'report_removed'
  | 'report_restored'
  | 'report_status_changed'
  | 'poll_hidden'
  | 'poll_restored'
  | 'poll_removed'
  | 'user_suspended'
  | 'user_unsuspended';

export interface ModerationLog {
  id: string;
  actorId: string;
  targetType: 'report' | 'poll' | 'user';
  targetId: string;
  action: ModerationAction;
  reason: string;
  createdAt: Timestamp;
}
