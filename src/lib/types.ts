// Core types for OmarLifePlanner

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string | null; // ISO datetime string
  priority: 'high' | 'medium' | 'low';
  categoryId: string;
  status: number; // 1-10
  notifications: NotificationSettings;
  calendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  '3d': boolean;
  '2d': boolean;
  '24h': boolean;
  '18h': boolean;
  '12h': boolean;
  '6h': boolean;
  '2h': boolean;
  '1h': boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex color
}

export interface TasksData {
  tasks: Task[];
  lastUpdated: string;
}

export interface CategoriesData {
  categories: Category[];
  lastUpdated: string;
}

// Default notification settings - all ON
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  '3d': true,
  '2d': true,
  '24h': true,
  '18h': true,
  '12h': true,
  '6h': true,
  '2h': true,
  '1h': true,
};

// Default categories with colors that don't clash with traffic light
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: '#3B82F6' },        // Blue
  { id: 'startup', name: 'Startup', color: '#8B5CF6' },  // Purple
  { id: 'university', name: 'University', color: '#06B6D4' }, // Teal/Cyan
  { id: 'personal', name: 'Personal Life', color: '#EC4899' }, // Pink
];

// Traffic light color calculation
export function getTrafficLightColor(task: Task): 'red' | 'orange' | 'yellow' | 'green' | 'gray' {
  if (!task.deadline) return 'gray';

  const now = new Date();
  const deadline = new Date(task.deadline);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Already past deadline
  if (hoursUntilDeadline < 0) {
    return task.status >= 10 ? 'green' : 'red';
  }

  // Status >= 8: Almost done - always green
  if (task.status >= 8) return 'green';

  // Status < 5 and deadline approaching
  if (task.status < 5) {
    if (hoursUntilDeadline <= 24) return 'red';
    if (hoursUntilDeadline <= 48) return 'orange';
  }

  // Status 5-7: In progress
  if (task.status >= 5) return 'yellow';

  // Low status but deadline far away
  if (hoursUntilDeadline > 168) return 'green'; // > 1 week
  if (hoursUntilDeadline > 72) return 'yellow'; // > 3 days

  return 'orange';
}

export function getStatusLabel(status: number): string {
  if (status <= 0) return 'Not Started';
  if (status < 5) return 'Started';
  if (status < 8) return 'In Progress';
  if (status < 10) return 'Almost Done';
  return 'Completed';
}
