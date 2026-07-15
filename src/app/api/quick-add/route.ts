// GET /api/quick-add - Public endpoint for Claude Mobile
// Accepts base64 encoded JSON task data with secret token

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTasks, saveTasks } from '@/lib/github-storage';
import { Task, DEFAULT_NOTIFICATIONS } from '@/lib/types';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const data = searchParams.get('data');

  // Verify secret token
  const secretToken = process.env.QUICK_ADD_SECRET;
  if (!secretToken || token !== secretToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!data) {
    return NextResponse.json({ error: 'No data provided' }, { status: 400 });
  }

  try {
    // Decode base64 JSON
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    const taskData = JSON.parse(decodedData);

    // Validate
    if (!taskData.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description || '',
      deadline: taskData.deadline || null,
      priority: taskData.priority || 'medium',
      categoryId: taskData.categoryId || 'personal',
      status: taskData.status ?? 0,
      notifications: taskData.notifications || { ...DEFAULT_NOTIFICATIONS },
      calendarEventId: null,
      createdAt: now,
      updatedAt: now,
    };

    // Create Google Calendar event if deadline is set
    if (newTask.deadline && process.env.GOOGLE_REFRESH_TOKEN) {
      const eventId = await createCalendarEvent(newTask);
      if (eventId) {
        newTask.calendarEventId = eventId;
      }
    }

    // Save to GitHub
    const tasksData = await getTasks();
    tasksData.tasks.push(newTask);
    await saveTasks(tasksData);

    // Redirect to dashboard with success message
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://omar-life-planner.vercel.app';
    return NextResponse.redirect(`${baseUrl}/?added=${newTask.id}`);
  } catch (error) {
    console.error('Quick-add error:', error);
    return NextResponse.json({ error: 'Invalid task data' }, { status: 400 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = body.token;

  // Verify secret token
  const secretToken = process.env.QUICK_ADD_SECRET;
  if (!secretToken || token !== secretToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!body.title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: uuidv4(),
      title: body.title,
      description: body.description || '',
      deadline: body.deadline || null,
      priority: body.priority || 'medium',
      categoryId: body.categoryId || 'personal',
      status: body.status ?? 0,
      notifications: body.notifications || { ...DEFAULT_NOTIFICATIONS },
      calendarEventId: null,
      createdAt: now,
      updatedAt: now,
    };

    // Create Google Calendar event if deadline is set
    if (newTask.deadline && process.env.GOOGLE_REFRESH_TOKEN) {
      const eventId = await createCalendarEvent(newTask);
      if (eventId) {
        newTask.calendarEventId = eventId;
      }
    }

    // Save to GitHub
    const tasksData = await getTasks();
    tasksData.tasks.push(newTask);
    await saveTasks(tasksData);

    return NextResponse.json({ task: newTask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Quick-add POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
