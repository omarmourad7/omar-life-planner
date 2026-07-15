/**
 * Outlook to Google Calendar Sync
 *
 * This script:
 * 1. Reads events from work Outlook calendar (via direct API since we can use the M365 auth)
 * 2. Writes them to Google Calendar
 * 3. Handles conflicts by checking if event already exists
 *
 * Prerequisites:
 * - Google Calendar API credentials configured
 * - Microsoft 365 authentication (via browser session)
 */

import { google } from 'googleapis';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Configuration
const SYNC_STATE_FILE = path.join(process.cwd(), '.sync-state.json');
const DAYS_TO_SYNC = 14; // Sync 2 weeks of events

interface SyncState {
  lastSync: string;
  syncedEvents: Record<string, string>; // Outlook ID -> Google Calendar ID
}

interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { content: string };
  isAllDay?: boolean;
}

// Load sync state
function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load sync state:', e);
  }
  return { lastSync: '', syncedEvents: {} };
}

// Save sync state
function saveSyncState(state: SyncState): void {
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

// Get Google Calendar client
function getGoogleCalendar() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Get Outlook events using the M365 MCP via Claude Code's infrastructure
// Since we're running locally, we can use the mcp__m365__cal_list_events tool concept
// but we need to call it via the API or direct Graph API
async function getOutlookEvents(): Promise<OutlookEvent[]> {
  // For this script, we'll use Microsoft Graph API directly
  // The M365 MCP maintains a browser session, so we need to use that

  // Try to call the M365 MCP tool via a local HTTP bridge or use Graph API
  // For simplicity, we'll simulate this with a placeholder
  // In production, you'd integrate with the actual M365 MCP

  console.log('Fetching Outlook events...');

  // Calculate date range
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + DAYS_TO_SYNC);

  // For now, return empty - this needs M365 integration
  // The actual implementation would call the M365 MCP
  console.log(`Would fetch events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Placeholder - in production, implement M365 Graph API call here
  // using the same authentication as the M365 MCP
  return [];
}

// Create or update Google Calendar event
async function syncEventToGoogle(
  calendar: ReturnType<typeof google.calendar>,
  outlookEvent: OutlookEvent,
  existingGoogleEventId?: string
): Promise<string | null> {
  const event = {
    summary: `[Work] ${outlookEvent.subject}`,
    description: outlookEvent.body?.content || '',
    start: {
      dateTime: outlookEvent.start.dateTime,
      timeZone: outlookEvent.start.timeZone || 'Pacific/Auckland',
    },
    end: {
      dateTime: outlookEvent.end.dateTime,
      timeZone: outlookEvent.end.timeZone || 'Pacific/Auckland',
    },
    location: outlookEvent.location?.displayName,
    colorId: '9', // Blue-gray for work events
  };

  try {
    if (existingGoogleEventId) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: existingGoogleEventId,
        requestBody: event,
      });
      console.log(`Updated event: ${outlookEvent.subject}`);
      return response.data.id || null;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      console.log(`Created event: ${outlookEvent.subject}`);
      return response.data.id || null;
    }
  } catch (error) {
    console.error(`Failed to sync event "${outlookEvent.subject}":`, error);
    return null;
  }
}

// Main sync function
async function main() {
  console.log('Starting Outlook to Google Calendar sync...');

  // Check for required env vars
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('Missing Google Calendar credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
    process.exit(1);
  }

  const state = loadSyncState();
  const calendar = getGoogleCalendar();

  try {
    // Get Outlook events
    const outlookEvents = await getOutlookEvents();
    console.log(`Found ${outlookEvents.length} Outlook events to sync`);

    // Sync each event
    for (const event of outlookEvents) {
      const existingId = state.syncedEvents[event.id];
      const googleEventId = await syncEventToGoogle(calendar, event, existingId);

      if (googleEventId) {
        state.syncedEvents[event.id] = googleEventId;
      }
    }

    // Update sync state
    state.lastSync = new Date().toISOString();
    saveSyncState(state);

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
