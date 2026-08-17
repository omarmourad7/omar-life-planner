// POST /api/tasks/sync-reminders - One-time migration to create Apple Reminders for existing tasks

import { NextResponse } from 'next/server';
import { getTasks, saveTasks } from '@/lib/github-storage';
import { createReminder } from '@/lib/apple-reminders';

export async function POST() {
  if (!process.env.APPLE_ICLOUD_EMAIL) {
    return NextResponse.json({
      error: 'Apple Reminders not configured. Add APPLE_ICLOUD_EMAIL and APPLE_ICLOUD_APP_PASSWORD.'
    }, { status: 400 });
  }

  try {
    const data = await getTasks();
    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const task of data.tasks) {
      // Skip tasks that already have a reminder or no deadline
      if (task.appleReminderId) {
        skipped++;
        continue;
      }
      if (!task.deadline) {
        skipped++;
        continue;
      }
      // Skip completed tasks
      if (task.status >= 10) {
        skipped++;
        continue;
      }

      try {
        const reminderId = await createReminder(task);
        if (reminderId) {
          task.appleReminderId = reminderId;
          synced++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Failed to sync task ${task.id}:`, err);
        failed++;
      }
    }

    // Save updated tasks with reminder IDs
    if (synced > 0) {
      await saveTasks(data);
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      failed,
      message: `Synced ${synced} tasks to Apple Reminders. Skipped ${skipped} (already synced, no deadline, or completed). Failed: ${failed}.`
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
