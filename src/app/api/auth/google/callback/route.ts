// Google OAuth callback handler

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Display the refresh token for the user to save
    // In production, you'd save this securely
    return new NextResponse(
      `
      <html>
        <head><title>Google Calendar Auth Success</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>✅ Google Calendar Connected!</h1>
          <p>Copy this refresh token and add it to your Vercel environment variables as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
          <textarea readonly style="width: 100%; height: 100px; font-family: monospace; font-size: 12px; padding: 10px;">${tokens.refresh_token}</textarea>
          <p style="color: #666; font-size: 14px;">After adding the environment variable, redeploy your Vercel app.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (err) {
    console.error('Failed to get tokens:', err);
    return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 500 });
  }
}
