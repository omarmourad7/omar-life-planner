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

// Default notification settings - all ON except 24h (Google Calendar max 5 reminders)
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  '3d': true,
  '2d': true,
  '24h': false,
  '18h': false,
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
  weeklyOverrides: Record<string, number>; // "Jul-W1" -> override amount
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

// ============================================================================
// Budget Cycle Helpers (15th-to-15th system)
// Budget month: 15th of one month to 14th of the next
// Named after the month where the 15th start date falls
// Week 1: 15th-21st, Week 2: 22nd-28th, Week 3: 29th-4th, Week 4: 5th-14th
// ============================================================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Get the budget month name for a given date (based on 15th cycle)
export function getBudgetMonthName(date: Date): string {
  const day = date.getDate();
  // If before the 15th, this date belongs to the PREVIOUS month's budget cycle
  if (day < 15) {
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 15);
    return MONTH_NAMES[prevMonth.getMonth()];
  }
  return MONTH_NAMES[date.getMonth()];
}

// Get the budget month key (e.g., "2026-Jul") for storage/lookup
export function getBudgetMonthKey(date: Date): string {
  const day = date.getDate();
  if (day < 15) {
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 15);
    return `${prevMonth.getFullYear()}-${MONTH_NAMES[prevMonth.getMonth()]}`;
  }
  return `${date.getFullYear()}-${MONTH_NAMES[date.getMonth()]}`;
}

// Get the start date of a budget month (the 15th)
export function getBudgetMonthStart(date: Date): Date {
  const day = date.getDate();
  if (day < 15) {
    return new Date(date.getFullYear(), date.getMonth() - 1, 15);
  }
  return new Date(date.getFullYear(), date.getMonth(), 15);
}

// Get the end date of a budget month (the 14th of next month)
export function getBudgetMonthEnd(date: Date): Date {
  const start = getBudgetMonthStart(date);
  return new Date(start.getFullYear(), start.getMonth() + 1, 14);
}

// Get which week (1-4) a date falls in within its budget month
export function getBudgetWeekNumber(date: Date): number {
  const start = getBudgetMonthStart(date);
  const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceStart < 7) return 1;  // 15th-21st
  if (daysSinceStart < 14) return 2; // 22nd-28th
  if (daysSinceStart < 21) return 3; // 29th-4th
  return 4;                           // 5th-14th
}

// Get the week key (e.g., "Jul-W1") for a given date
export function getBudgetWeekKey(date: Date): string {
  const monthName = getBudgetMonthName(date);
  const weekNum = getBudgetWeekNumber(date);
  return `${monthName}-W${weekNum}`;
}

// Get the start date of a specific budget week
export function getBudgetWeekStart(date: Date): Date {
  const monthStart = getBudgetMonthStart(date);
  const weekNum = getBudgetWeekNumber(date);
  const daysOffset = (weekNum - 1) * 7;
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + daysOffset);
}

// Get the end date of a specific budget week
export function getBudgetWeekEnd(date: Date): Date {
  const weekStart = getBudgetWeekStart(date);
  const weekNum = getBudgetWeekNumber(date);
  if (weekNum === 4) {
    // Week 4 ends on the 14th (end of budget month)
    return getBudgetMonthEnd(date);
  }
  // Weeks 1-3 are 7 days
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
}

// Check if a date string (YYYY-MM-DD) falls within a budget week
export function isDateInBudgetWeek(dateStr: string, referenceDate: Date): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  const weekStart = getBudgetWeekStart(referenceDate);
  const weekEnd = getBudgetWeekEnd(referenceDate);
  return date >= weekStart && date <= weekEnd;
}

// Check if a date string falls within a budget month
export function isDateInBudgetMonth(dateStr: string, referenceDate: Date): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  const monthStart = getBudgetMonthStart(referenceDate);
  const monthEnd = getBudgetMonthEnd(referenceDate);
  return date >= monthStart && date <= monthEnd;
}

// Get all 4 week keys for a budget month
export function getWeeksInBudgetMonth(date: Date): string[] {
  const monthName = getBudgetMonthName(date);
  return [`${monthName}-W1`, `${monthName}-W2`, `${monthName}-W3`, `${monthName}-W4`];
}

// Calculate weekly budget considering overrides
export function getWeeklyBudget(budget: Budget, weekKey: string, date: Date): number {
  // If there's an override for this specific week, use it
  if (budget.weeklyOverrides[weekKey] !== undefined) {
    return budget.weeklyOverrides[weekKey];
  }

  // Base weekly budget = monthly / 4
  const baseWeekly = budget.monthlyBudget / 4;

  // Check if other weeks in this month have overrides
  const monthWeeks = getWeeksInBudgetMonth(date);
  const overriddenWeeks = monthWeeks.filter(w => budget.weeklyOverrides[w] !== undefined);

  if (overriddenWeeks.length === 0) {
    return baseWeekly;
  }

  // Calculate remaining budget after overrides, spread equally among non-overridden weeks
  const overriddenTotal = overriddenWeeks.reduce(
    (sum, w) => sum + (budget.weeklyOverrides[w] || 0),
    0
  );
  const remainingBudget = budget.monthlyBudget - overriddenTotal;
  const remainingWeeks = monthWeeks.length - overriddenWeeks.length;

  return remainingWeeks > 0 ? remainingBudget / remainingWeeks : 0;
}

// Format a budget week for display: "Jul Week 1 (15-21)"
export function formatBudgetWeek(date: Date): string {
  const monthName = getBudgetMonthName(date);
  const weekNum = getBudgetWeekNumber(date);
  const start = getBudgetWeekStart(date);
  const end = getBudgetWeekEnd(date);
  return `${monthName} Week ${weekNum} (${start.getDate()}-${end.getDate()})`;
}

// Format a budget month for display: "Jul 15 - Aug 14"
export function formatBudgetMonth(date: Date): string {
  const start = getBudgetMonthStart(date);
  const end = getBudgetMonthEnd(date);
  const startMonth = MONTH_NAMES[start.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

// Legacy helpers kept for compatibility
export function getISOWeekString(date: Date): string {
  return getBudgetWeekKey(date);
}

export function getWeekStart(date: Date): Date {
  return getBudgetWeekStart(date);
}

export function getWeekEnd(date: Date): Date {
  return getBudgetWeekEnd(date);
}

export function getMonthString(date: Date): string {
  return getBudgetMonthKey(date);
}

export function getWeeksInMonth(monthString: string): string[] {
  // Extract month name and return the 4 weeks
  const parts = monthString.split('-');
  const monthName = parts[parts.length - 1];
  return [`${monthName}-W1`, `${monthName}-W2`, `${monthName}-W3`, `${monthName}-W4`];
}
