// GET /api/tasks/[id] - Get single task
// PUT /api/tasks/[id] - Update task
// DELETE /api/tasks/[id] - Delete task

import { NextRequest, NextResponse } from 'next/server';
import { getTasks, saveTasks } from '@/lib/github-storage';
import { updateCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/google-calendar';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data = await getTasks();
    const task = data.tasks.find(t => t.id === id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await getTasks();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const existingTask = data.tasks[taskIndex];
    const updatedTask = {
      ...existingTask,
      ...body,
      id: existingTask.id, // Prevent ID change
      createdAt: existingTask.createdAt, // Prevent createdAt change
      updatedAt: new Date().toISOString(),
    };

    // Handle calendar event updates
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      const deadlineChanged = existingTask.deadline !== updatedTask.deadline;
      const notificationsChanged = JSON.stringify(existingTask.notifications) !== JSON.stringify(updatedTask.notifications);

      if (updatedTask.deadline) {
        if (existingTask.calendarEventId && (deadlineChanged || notificationsChanged)) {
          // Update existing event
          await updateCalendarEvent(existingTask.calendarEventId, updatedTask);
        } else if (!existingTask.calendarEventId) {
          // Create new event
          const eventId = await createCalendarEvent(updatedTask);
          if (eventId) {
            updatedTask.calendarEventId = eventId;
          }
        }
      } else if (existingTask.calendarEventId && !updatedTask.deadline) {
        // Deadline removed, delete event
        await deleteCalendarEvent(existingTask.calendarEventId);
        updatedTask.calendarEventId = null;
      }
    }

    data.tasks[taskIndex] = updatedTask;
    await saveTasks(data);

    return NextResponse.json({ task: updatedTask, success: true });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data = await getTasks();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = data.tasks[taskIndex];

    // Delete calendar event if exists
    if (task.calendarEventId && process.env.GOOGLE_REFRESH_TOKEN) {
      await deleteCalendarEvent(task.calendarEventId);
    }

    data.tasks.splice(taskIndex, 1);
    await saveTasks(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
