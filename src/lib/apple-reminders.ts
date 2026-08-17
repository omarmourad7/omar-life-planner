// Apple Reminders integration via iCloud CalDAV
import { DAVClient, DAVCalendar } from 'tsdav';
import { Task, NotificationSettings } from './types';

// Cached client and calendar URL
let cachedClient: DAVClient | null = null;
let cachedCalendarUrl: string | null = null;

function getCredentials() {
  const email = process.env.APPLE_ICLOUD_EMAIL;
  const password = process.env.APPLE_ICLOUD_APP_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

async function getClient(): Promise<DAVClient | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  if (cachedClient) return cachedClient;

  const client = new DAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: {
      username: credentials.email,
      password: credentials.password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  await client.login();
  cachedClient = client;
  return client;
}

async function getRemindersCalendar(): Promise<{ client: DAVClient; calendar: DAVCalendar } | null> {
  const client = await getClient();
  if (!client) return null;

  // Get all calendars (which includes reminders/task lists)
  const calendars = await client.fetchCalendars();

  // Find the default Reminders calendar
  // iCloud Reminders calendars have supportedReportSet that includes VTODO
  // Look for one named "Reminders" or the default tasks calendar
  let remindersCalendar = calendars.find(
    cal => {
      const name = String(cal.displayName || '').toLowerCase();
      return name === 'reminders' || name === 'tasks' || (cal.components?.includes('VTODO'));
    }
  );

  // If no specific reminders calendar found, use the first one that supports VTODO
  if (!remindersCalendar) {
    remindersCalendar = calendars.find(cal => cal.components?.includes('VTODO'));
  }

  // If still nothing, try the first calendar as fallback
  if (!remindersCalendar && calendars.length > 0) {
    remindersCalendar = calendars[0];
  }

  if (!remindersCalendar) {
    console.error('No reminders calendar found in iCloud');
    return null;
  }

  cachedCalendarUrl = remindersCalendar.url;
  return { client, calendar: remindersCalendar };
}

// Convert notification settings to VALARM components
function buildAlarms(notifications: NotificationSettings): string {
  const alarms: string[] = [];

  const durationsMap: Record<keyof NotificationSettings, string> = {
    '3d': 'P3D',      // 3 days
    '2d': 'P2D',      // 2 days
    '24h': 'PT24H',   // 24 hours
    '18h': 'PT18H',   // 18 hours
    '12h': 'PT12H',   // 12 hours
    '6h': 'PT6H',     // 6 hours
    '2h': 'PT2H',     // 2 hours
    '1h': 'PT1H',     // 1 hour
  };

  for (const [key, enabled] of Object.entries(notifications)) {
    if (enabled && key in durationsMap) {
      const duration = durationsMap[key as keyof NotificationSettings];
      alarms.push(
        `BEGIN:VALARM\r\n` +
        `TRIGGER:-${duration}\r\n` +
        `ACTION:DISPLAY\r\n` +
        `DESCRIPTION:${key} reminder\r\n` +
        `END:VALARM`
      );
    }
  }

  return alarms.join('\r\n');
}

// Format date for iCalendar (YYYYMMDDTHHMMSSZ)
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Map priority to iCalendar PRIORITY (1=high, 5=medium, 9=low)
function mapPriority(priority: string): number {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 5;
    case 'low': return 9;
    default: return 5;
  }
}

export async function createReminder(task: Task): Promise<string | null> {
  if (!task.deadline) return null;

  const result = await getRemindersCalendar();
  if (!result) return null;

  const { client, calendar } = result;
  const uid = `${task.id}@omar-life-planner`;
  const deadline = new Date(task.deadline);
  const now = new Date();

  const alarms = buildAlarms(task.notifications);

  const vtodo = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Omar Life Planner//NONSGML v1.0//EN',
    'BEGIN:VTODO',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `CREATED:${formatICalDate(now)}`,
    `LAST-MODIFIED:${formatICalDate(now)}`,
    `SUMMARY:${task.title.replace(/[,;\\]/g, '\\$&')}`,
    task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, '\\$&')}` : null,
    `DUE:${formatICalDate(deadline)}`,
    `PRIORITY:${mapPriority(task.priority)}`,
    'STATUS:NEEDS-ACTION',
    alarms,
    'END:VTODO',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  try {
    await client.createCalendarObject({
      calendar,
      filename: `${task.id}.ics`,
      iCalString: vtodo,
    });

    return uid;
  } catch (error) {
    console.error('Failed to create Apple Reminder:', error);
    return null;
  }
}

export async function updateReminder(task: Task): Promise<boolean> {
  if (!task.appleReminderId) return false;

  const result = await getRemindersCalendar();
  if (!result) return false;

  const { client, calendar } = result;
  const now = new Date();
  const deadline = task.deadline ? new Date(task.deadline) : null;

  // Determine status
  let status = 'NEEDS-ACTION';
  if (task.status >= 10) {
    status = 'COMPLETED';
  } else if (task.status > 0) {
    status = 'IN-PROCESS';
  }

  const alarms = task.notifications ? buildAlarms(task.notifications) : '';

  const vtodo = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Omar Life Planner//NONSGML v1.0//EN',
    'BEGIN:VTODO',
    `UID:${task.appleReminderId}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `LAST-MODIFIED:${formatICalDate(now)}`,
    `SUMMARY:${task.title.replace(/[,;\\]/g, '\\$&')}`,
    task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, '\\$&')}` : null,
    deadline ? `DUE:${formatICalDate(deadline)}` : null,
    `PRIORITY:${mapPriority(task.priority)}`,
    `STATUS:${status}`,
    status === 'COMPLETED' ? `COMPLETED:${formatICalDate(now)}` : null,
    status === 'COMPLETED' ? 'PERCENT-COMPLETE:100' : (task.status > 0 ? `PERCENT-COMPLETE:${task.status * 10}` : null),
    alarms,
    'END:VTODO',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  try {
    // First, fetch existing object to get its etag
    const objects = await client.fetchCalendarObjects({
      calendar,
      filters: {
        'comp-filter': {
          _attributes: { name: 'VCALENDAR' },
          'comp-filter': {
            _attributes: { name: 'VTODO' },
            'prop-filter': {
              _attributes: { name: 'UID' },
              'text-match': {
                _attributes: { collation: 'i;octet' },
                _text: task.appleReminderId,
              },
            },
          },
        },
      },
    });

    if (objects.length === 0) {
      // Object doesn't exist, create it instead
      if (task.deadline) {
        const newUid = await createReminder(task);
        return newUid !== null;
      }
      return false;
    }

    const existingObject = objects[0];

    await client.updateCalendarObject({
      calendarObject: {
        url: existingObject.url,
        etag: existingObject.etag,
        data: vtodo,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to update Apple Reminder:', error);
    return false;
  }
}

export async function deleteReminder(appleReminderId: string): Promise<boolean> {
  const result = await getRemindersCalendar();
  if (!result) return false;

  const { client, calendar } = result;

  try {
    // Fetch the object to get its URL
    const objects = await client.fetchCalendarObjects({
      calendar,
      filters: {
        'comp-filter': {
          _attributes: { name: 'VCALENDAR' },
          'comp-filter': {
            _attributes: { name: 'VTODO' },
            'prop-filter': {
              _attributes: { name: 'UID' },
              'text-match': {
                _attributes: { collation: 'i;octet' },
                _text: appleReminderId,
              },
            },
          },
        },
      },
    });

    if (objects.length === 0) {
      // Already deleted or doesn't exist
      return true;
    }

    await client.deleteCalendarObject({
      calendarObject: {
        url: objects[0].url,
        etag: objects[0].etag,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to delete Apple Reminder:', error);
    return false;
  }
}

export async function completeReminder(task: Task): Promise<boolean> {
  // Mark as completed by updating with status=10
  const completedTask = { ...task, status: 10 };
  return updateReminder(completedTask);
}

// Test connection - useful for setup verification
export async function testConnection(): Promise<{ success: boolean; message: string; calendars?: string[] }> {
  try {
    const client = await getClient();
    if (!client) {
      return {
        success: false,
        message: 'Missing APPLE_ICLOUD_EMAIL or APPLE_ICLOUD_APP_PASSWORD environment variables',
      };
    }

    const calendars = await client.fetchCalendars();
    const calendarNames = calendars.map(c => c.displayName || c.url).filter(Boolean) as string[];

    return {
      success: true,
      message: `Connected successfully. Found ${calendars.length} calendar(s).`,
      calendars: calendarNames,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
    };
  }
}
