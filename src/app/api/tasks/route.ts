// GET /api/tasks - List all tasks
// POST /api/tasks - Create new task

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTasks, saveTasks } from '@/lib/github-storage';
import { Task, DEFAULT_NOTIFICATIONS } from '@/lib/types';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function GET() {
  try {
    const data = await getTasks();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

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
    const data = await getTasks();
    data.tasks.push(newTask);
    await saveTasks(data);

    return NextResponse.json({ task: newTask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
