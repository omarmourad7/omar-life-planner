# Omar Life Planner

Personal task management system with Claude AI integration, Google Calendar sync, and multi-device support.

## Features

- **Task Management**: Create, update, delete tasks with priorities, categories, and status tracking (1-10 scale)
- **Traffic Light System**: Visual indicators based on status and deadline proximity
- **Custom Categories**: Work, Startup, University, Personal Life (+ custom)
- **Google Calendar Integration**: Tasks with deadlines become calendar events with customizable reminders
- **Claude Desktop MCP**: Manage tasks directly from Claude Desktop
- **Claude Mobile Support**: Quick-add URLs for adding tasks from Claude mobile
- **JSON Import**: Fallback for when MCP isn't available

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Storage**: GitHub JSON files (tasks.json, categories.json)
- **Hosting**: Vercel (free tier)
- **Calendar**: Google Calendar API
- **AI Integration**: MCP server for Claude Desktop

## Setup

### 1. Clone and Install

```bash
git clone git@github-university:omarmourad7/omar-life-planner.git
cd omar-life-planner
npm install
```

### 2. Create Data Repository

Create a separate private repo `omar-life-planner-data` on GitHub to store your tasks:

```bash
# On GitHub, create: omarmourad7/omar-life-planner-data
# Then initialize with empty JSON files
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
GITHUB_TOKEN=ghp_... # Personal access token with repo scope
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=... # Get this after OAuth flow
QUICK_ADD_SECRET=... # Random string for Claude mobile URLs
```

### 4. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `https://your-app.vercel.app/api/auth/google/callback`
6. Visit `https://your-app.vercel.app/api/auth/google` to authenticate
7. Copy the refresh token to your environment variables

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
# Follow prompts, add environment variables in Vercel dashboard
```

### 6. Set Up MCP for Claude Desktop

```bash
cd mcp-server
npm install
npm run build
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "omar-life-planner": {
      "command": "node",
      "args": ["/path/to/omar-life-planner/mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://your-app.vercel.app",
        "QUICK_ADD_SECRET": "your-secret"
      }
    }
  }
}
```

### 7. Set Up Calendar Sync (Optional)

To sync work Outlook to Google Calendar every 15 minutes:

```bash
# Edit the plist file with your credentials
nano scripts/com.omar.outlook-gcal-sync.plist

# Install launchd job
cp scripts/com.omar.outlook-gcal-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.omar.outlook-gcal-sync.plist
```

## Usage

### Web App

Visit your Vercel deployment to:
- Add/edit/delete tasks
- Manage categories
- Adjust notification settings per task
- Import JSON from Claude

### Claude Desktop

Use the MCP tools:
- `add_task` - Create a new task
- `list_tasks` - View all tasks
- `update_task` - Update a task
- `delete_task` - Remove a task
- `list_categories` - See available categories
- `get_quick_add_url` - Generate URL for mobile

### Claude Mobile

Ask Claude to generate a quick-add URL, then tap it to add the task.

## Notification Schedule

When a task has a deadline, it creates a Google Calendar event with these reminders (all ON by default, customizable per task):
- 3 days before
- 2 days before
- 24 hours before
- 18 hours before
- 12 hours before
- 6 hours before
- 2 hours before
- 1 hour before

## Traffic Light Colors

- Red: Status < 5 AND deadline within 24 hours
- Orange: Status < 5 AND deadline within 48 hours
- Yellow: Status 5-7 (in progress)
- Green: Status >= 8 (almost done) OR deadline far away

## License

Private - Omar Mourad
