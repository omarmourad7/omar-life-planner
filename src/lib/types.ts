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

// ============================================================================
// Financial Tracking Types
// ============================================================================

export interface Transaction {
  id: string;
  amount: number; // always positive
  currency: string; // "NZD" default
  amountNZD: number; // converted amount for budget tracking
  description: string;
  categoryId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  isSubscription: boolean;
  subscriptionFrequency?: 'weekly' | 'monthly' | 'yearly';
  createdAt: string;
}

export interface Budget {
  monthlyBudget: number;
  weeklyOverrides: Record<string, number>; // "2026-W29" -> override amount
}

export interface FinancialCategory {
  id: string;
  name: string;
  color: string; // hex color
  icon: string; // emoji or icon name
}

export interface FinancialData {
  transactions: Transaction[];
  budget: Budget;
  categories: FinancialCategory[];
  lastUpdated: string;
}

// Default financial categories
export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  { id: 'food', name: 'Food & Groceries', color: '#22C55E', icon: '🛒' },
  { id: 'transport', name: 'Transport/Fuel', color: '#3B82F6', icon: '🚗' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#8B5CF6', icon: '🔄' },
  { id: 'entertainment', name: 'Entertainment', color: '#EC4899', icon: '🎬' },
  { id: 'travel', name: 'Travel', color: '#F59E0B', icon: '✈️' },
  { id: 'rent-bills', name: 'Rent/Bills', color: '#EF4444', icon: '🏠' },
  { id: 'shopping', name: 'Shopping', color: '#06B6D4', icon: '🛍️' },
  { id: 'other', name: 'Other', color: '#6B7280', icon: '📦' },
];

export const DEFAULT_BUDGET: Budget = {
  monthlyBudget: 2000,
  weeklyOverrides: {},
};

// Helper: Get ISO week string (e.g. "2026-W29")
export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper: Get the Monday of the ISO week for a given date
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper: Get the Sunday of the ISO week for a given date
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

// Helper: Get month string (e.g. "2026-07")
export function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Helper: Calculate weekly budget considering overrides
export function getWeeklyBudget(budget: Budget, weekString: string, monthString: string): number {
  // If there's an override for this specific week, use it
  if (budget.weeklyOverrides[weekString] !== undefined) {
    return budget.weeklyOverrides[weekString];
  }

  // Base weekly budget = monthly / 4
  const baseWeekly = budget.monthlyBudget / 4;

  // Check if other weeks in this month have overrides that affect this week
  const monthWeeks = getWeeksInMonth(monthString);
  const overriddenWeeks = monthWeeks.filter(w => budget.weeklyOverrides[w] !== undefined);

  if (overriddenWeeks.length === 0) {
    return baseWeekly;
  }

  // Calculate remaining budget after overrides
  const overriddenTotal = overriddenWeeks.reduce(
    (sum, w) => sum + (budget.weeklyOverrides[w] || 0),
    0
  );
  const remainingBudget = budget.monthlyBudget - overriddenTotal;
  const remainingWeeks = monthWeeks.length - overriddenWeeks.length;

  return remainingWeeks > 0 ? remainingBudget / remainingWeeks : 0;
}

// Helper: Get all ISO week strings that overlap with a given month
export function getWeeksInMonth(monthString: string): string[] {
  const [year, month] = monthString.split('-').map(Number);
  const weeks: string[] = [];
  const seen = new Set<string>();

  // Iterate through each day of the month
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const weekStr = getISOWeekString(date);
    if (!seen.has(weekStr)) {
      seen.add(weekStr);
      weeks.push(weekStr);
    }
  }

  return weeks;
}
