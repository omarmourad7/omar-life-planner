// Debug endpoint to investigate iCloud CalDAV structure

import { NextResponse } from 'next/server';
import { DAVClient } from 'tsdav';

export async function GET() {
  const email = process.env.APPLE_ICLOUD_EMAIL;
  const password = process.env.APPLE_ICLOUD_APP_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  try {
    const client = new DAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: email, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    await client.login();

    // Get account info
    const account = client.account;

    // Fetch all calendars with full details
    const calendars = await client.fetchCalendars();

    const calendarDetails = calendars.map(cal => ({
      displayName: cal.displayName,
      url: cal.url,
      ctag: cal.ctag,
      components: cal.components,
      resourcetype: cal.resourcetype,
      syncToken: cal.syncToken,
    }));

    // Try to find calendars that support VTODO
    const todoCalendars = calendars.filter(cal => cal.components?.includes('VTODO'));

    // For each TODO calendar, try to fetch existing objects
    const existingObjects: Record<string, unknown[]> = {};
    for (const cal of todoCalendars.slice(0, 2)) { // Limit to first 2
      const calKey = String(cal.displayName || cal.url);
      try {
        const objects = await client.fetchCalendarObjects({ calendar: cal });
        existingObjects[calKey] = objects.map(obj => ({
          url: obj.url,
          etag: obj.etag,
          dataPreview: typeof obj.data === 'string' ? obj.data.substring(0, 500) : 'no data',
        }));
      } catch (e) {
        existingObjects[calKey] = [{ error: String(e) }];
      }
    }

    return NextResponse.json({
      account: {
        serverUrl: account?.serverUrl,
        rootUrl: account?.rootUrl,
        principalUrl: account?.principalUrl,
        homeUrl: account?.homeUrl,
      },
      totalCalendars: calendars.length,
      todoCalendars: todoCalendars.length,
      calendarDetails,
      existingObjects,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
