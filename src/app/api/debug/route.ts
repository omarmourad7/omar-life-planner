// Temporary debug route - check Google Calendar connectivity
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status: Record<string, unknown> = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN ? `SET (${process.env.GOOGLE_REFRESH_TOKEN.slice(0, 10)}...)` : 'MISSING',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT SET (using default)',
  };

  // Try to create a calendar client and list events
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Try to list upcoming events
    const events = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 3,
      timeMin: new Date().toISOString(),
      orderBy: 'startTime',
      singleEvents: true,
    });

    status.calendarConnection = 'SUCCESS';
    status.upcomingEvents = events.data.items?.length || 0;
    status.calendarTimezone = events.data.timeZone;
  } catch (error) {
    status.calendarConnection = 'FAILED';
    status.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(status);
}
