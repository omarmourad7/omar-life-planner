// GET /api/tasks/[id] - Get single task
// PUT /api/tasks/[id] - Update task
// DELETE /api/tasks/[id] - Delete task

import { NextRequest, NextResponse } from 'next/server';
import { getTasks, saveTasks } from '@/lib/github-storage';
import { updateCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/google-calendar';
import { createReminder, updateReminder, deleteReminder } from '@/lib/apple-reminders';

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

    // Handle Apple Reminders updates
    if (process.env.APPLE_ICLOUD_EMAIL) {
      const deadlineChanged = existingTask.deadline !== updatedTask.deadline;
      const notificationsChanged = JSON.stringify(existingTask.notifications) !== JSON.stringify(updatedTask.notifications);
      const statusChanged = existingTask.status !== updatedTask.status;
      const titleChanged = existingTask.title !== updatedTask.title;

      if (updatedTask.deadline) {
        if (existingTask.appleReminderId && (deadlineChanged || notificationsChanged || statusChanged || titleChanged)) {
          // Update existing reminder
          await updateReminder(updatedTask);
        } else if (!existingTask.appleReminderId) {
          // Create new reminder
          const reminderId = await createReminder(updatedTask);
          if (reminderId) {
            updatedTask.appleReminderId = reminderId;
          }
        }
      } else if (existingTask.appleReminderId && !updatedTask.deadline) {
        // Deadline removed, delete reminder
        await deleteReminder(existingTask.appleReminderId);
        updatedTask.appleReminderId = null;
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

    // Delete Apple Reminder if exists
    if (task.appleReminderId && process.env.APPLE_ICLOUD_EMAIL) {
      await deleteReminder(task.appleReminderId);
    }

    data.tasks.splice(taskIndex, 1);
    await saveTasks(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
