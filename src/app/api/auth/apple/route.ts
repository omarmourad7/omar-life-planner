// GET /api/auth/apple - Setup instructions and connection test
// POST /api/auth/apple - Test connection with provided credentials

import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/apple-reminders';

export async function GET() {
  // Test current connection status
  const result = await testConnection();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Apple Reminders Setup</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #1a1a1a;
      color: #e5e5e5;
    }
    h1 { color: #fff; }
    h2 { color: #a1a1a1; margin-top: 2em; }
    .status {
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .success { background: #052e16; border: 1px solid #16a34a; }
    .error { background: #450a0a; border: 1px solid #dc2626; }
    .step {
      background: #262626;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
    }
    .step-num {
      background: #3b82f6;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 10px;
    }
    code {
      background: #374151;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre {
      background: #374151;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    a { color: #60a5fa; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>🍎 Apple Reminders Setup</h1>

  <div class="status ${result.success ? 'success' : 'error'}">
    <strong>${result.success ? '✅ Connected!' : '❌ Not Connected'}</strong><br>
    ${result.message}
    ${result.calendars ? '<br><br><strong>Calendars found:</strong> ' + result.calendars.join(', ') : ''}
  </div>

  ${!result.success ? `
  <h2>Setup Instructions</h2>

  <div class="step">
    <span class="step-num">1</span>
    <strong>Create an App-Specific Password</strong>
    <p>Go to <a href="https://appleid.apple.com/account/manage" target="_blank">appleid.apple.com</a> → Sign-In & Security → App-Specific Passwords → Generate</p>
    <p>Name it something like "Omar Life Planner"</p>
  </div>

  <div class="step">
    <span class="step-num">2</span>
    <strong>Add Environment Variables</strong>
    <p>Add these to your <code>.env.local</code> file (or Vercel environment variables):</p>
    <pre>APPLE_ICLOUD_EMAIL=your-apple-id@icloud.com
APPLE_ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx</pre>
  </div>

  <div class="step">
    <span class="step-num">3</span>
    <strong>Restart the Server</strong>
    <p>After adding the env vars, restart the development server or redeploy.</p>
  </div>

  <div class="step">
    <span class="step-num">4</span>
    <strong>Refresh This Page</strong>
    <p>Come back here to verify the connection works.</p>
  </div>
  ` : `
  <h2>Sync Existing Tasks</h2>
  <p>Click below to create Apple Reminders for all existing tasks with deadlines:</p>
  <button id="syncBtn" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px 0;">
    Sync Existing Tasks to Reminders
  </button>
  <div id="syncResult" style="margin-top: 10px;"></div>
  <script>
    document.getElementById('syncBtn').onclick = async function() {
      this.disabled = true;
      this.textContent = 'Syncing...';
      document.getElementById('syncResult').textContent = '';
      try {
        const res = await fetch('/api/tasks/sync-reminders', { method: 'POST' });
        const data = await res.json();
        document.getElementById('syncResult').innerHTML = '<div class="status success">' + data.message + '</div>';
      } catch (err) {
        document.getElementById('syncResult').innerHTML = '<div class="status error">Sync failed: ' + err.message + '</div>';
      }
      this.disabled = false;
      this.textContent = 'Sync Existing Tasks to Reminders';
    };
  </script>

  <h2>How It Works</h2>
  <ul>
    <li><strong>Create task with deadline</strong> → Reminder created in Apple Reminders</li>
    <li><strong>Update task</strong> → Reminder updated (title, deadline, notifications)</li>
    <li><strong>Complete task (status=10)</strong> → Reminder marked as completed</li>
    <li><strong>Delete task</strong> → Reminder deleted</li>
  </ul>

  <h2>Important Notes</h2>
  <ul>
    <li><strong>One-way sync:</strong> Changes in Life Planner → Reminders. Completing a reminder in Apple Reminders will NOT update the task here.</li>
    <li>If reminders don't appear, check that iCloud Reminders sync is enabled on your iPhone</li>
    <li>New reminders may take a few seconds to sync across devices</li>
  </ul>
  `}

  <p style="margin-top: 40px; color: #737373;">
    <a href="/">← Back to Dashboard</a>
  </p>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST(request: NextRequest) {
  // Test connection with current env vars
  const result = await testConnection();
  return NextResponse.json(result);
}
