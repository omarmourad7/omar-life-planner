// Google Calendar integration
import { google, calendar_v3 } from 'googleapis';
import { Task, NotificationSettings } from './types';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getAuth() {
  const credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  };

  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  );

  // If we have refresh token, set it
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

export function getAuthUrl(): string {
  const oauth2Client = getAuth();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getAuth();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getCalendar(): calendar_v3.Calendar {
  const auth = getAuth();
  return google.calendar({ version: 'v3', auth });
}

// Convert notification settings to Google Calendar reminders
function buildReminders(notifications: NotificationSettings): calendar_v3.Schema$EventReminder[] {
  const reminders: calendar_v3.Schema$EventReminder[] = [];

  const minutesMap: Record<keyof NotificationSettings, number> = {
    '3d': 3 * 24 * 60,    // 4320 minutes
    '2d': 2 * 24 * 60,    // 2880 minutes
    '24h': 24 * 60,       // 1440 minutes
    '18h': 18 * 60,       // 1080 minutes
    '12h': 12 * 60,       // 720 minutes
    '6h': 6 * 60,         // 360 minutes
    '2h': 2 * 60,         // 120 minutes
    '1h': 60,             // 60 minutes
  };

  for (const [key, enabled] of Object.entries(notifications)) {
    if (enabled && key in minutesMap) {
      reminders.push({
        method: 'popup',
        minutes: minutesMap[key as keyof NotificationSettings],
      });
    }
  }

  return reminders;
}

export async function createCalendarEvent(task: Task): Promise<string | null> {
  if (!task.deadline) return null;

  const calendar = getCalendar();
  const deadline = new Date(task.deadline);

  // Create a 30-minute event at the deadline
  const endTime = new Date(deadline.getTime() + 30 * 60 * 1000);

  const event: calendar_v3.Schema$Event = {
    summary: `📋 ${task.title}`,
    description: `${task.description}\n\nPriority: ${task.priority}\nStatus: ${task.status}/10`,
    start: {
      dateTime: deadline.toISOString(),
      timeZone: 'Pacific/Auckland', // NZ timezone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Pacific/Auckland',
    },
    reminders: {
      useDefault: false,
      overrides: buildReminders(task.notifications),
    },
    colorId: task.priority === 'high' ? '11' : task.priority === 'medium' ? '5' : '2',
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

export async function updateCalendarEvent(eventId: string, task: Task): Promise<boolean> {
  if (!task.deadline) return false;

  const calendar = getCalendar();
  const deadline = new Date(task.deadline);
  const endTime = new Date(deadline.getTime() + 30 * 60 * 1000);

  const event: calendar_v3.Schema$Event = {
    summary: `📋 ${task.title}`,
    description: `${task.description}\n\nPriority: ${task.priority}\nStatus: ${task.status}/10`,
    start: {
      dateTime: deadline.toISOString(),
      timeZone: 'Pacific/Auckland',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Pacific/Auckland',
    },
    reminders: {
      useDefault: false,
      overrides: buildReminders(task.notifications),
    },
    colorId: task.priority === 'high' ? '11' : task.priority === 'medium' ? '5' : '2',
  };

  try {
    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
    });
    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendar();

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}
