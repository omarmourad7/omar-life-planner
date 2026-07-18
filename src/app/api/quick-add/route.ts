// GET /api/quick-add - Public endpoint for Claude Mobile
// Accepts base64 encoded JSON task/transaction data with secret token
// Differentiates by "type" field: "task" (default) or "transaction"

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTasks, saveTasks, getFinancialData, saveFinancialData } from '@/lib/github-storage';
import { Task, Transaction, DEFAULT_NOTIFICATIONS } from '@/lib/types';
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
    const parsedData = JSON.parse(decodedData);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://omar-life-planner.vercel.app';

    // Route based on type field
    if (parsedData.type === 'transaction') {
      return await handleTransaction(parsedData, baseUrl);
    } else {
      return await handleTask(parsedData, baseUrl);
    }
  } catch (error) {
    console.error('Quick-add error:', error);
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

async function handleTask(taskData: Record<string, unknown>, baseUrl: string) {
  if (!taskData.title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newTask: Task = {
    id: uuidv4(),
    title: taskData.title as string,
    description: (taskData.description as string) || '',
    deadline: (taskData.deadline as string) || null,
    priority: (taskData.priority as 'high' | 'medium' | 'low') || 'medium',
    categoryId: (taskData.categoryId as string) || 'personal',
    status: (taskData.status as number) ?? 0,
    notifications: (taskData.notifications as Task['notifications']) || { ...DEFAULT_NOTIFICATIONS },
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

  return NextResponse.redirect(`${baseUrl}/?added=${newTask.id}`);
}

async function handleTransaction(txnData: Record<string, unknown>, baseUrl: string) {
  if (!txnData.amount || !txnData.description) {
    return NextResponse.json({ error: 'Amount and description are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const amount = Math.abs(Number(txnData.amount));
  const newTransaction: Transaction = {
    id: uuidv4(),
    amount,
    currency: (txnData.currency as string) || 'NZD',
    amountNZD: Math.abs(Number(txnData.amountNZD || txnData.amount)),
    description: txnData.description as string,
    categoryId: (txnData.categoryId as string) || 'other',
    date: (txnData.date as string) || now.split('T')[0],
    isSubscription: (txnData.isSubscription as boolean) || false,
    subscriptionFrequency: txnData.subscriptionFrequency as Transaction['subscriptionFrequency'],
    createdAt: now,
  };

  // Save to GitHub
  const financialData = await getFinancialData();
  financialData.transactions.push(newTransaction);
  await saveFinancialData(financialData);

  return NextResponse.redirect(`${baseUrl}/money?added_txn=${newTransaction.id}`);
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

  // Route based on type field
  if (body.type === 'transaction') {
    if (!body.amount || !body.description) {
      return NextResponse.json({ error: 'Amount and description are required' }, { status: 400 });
    }

    try {
      const now = new Date().toISOString();
      const newTransaction: Transaction = {
        id: uuidv4(),
        amount: Math.abs(Number(body.amount)),
        currency: body.currency || 'NZD',
        amountNZD: Math.abs(Number(body.amountNZD || body.amount)),
        description: body.description,
        categoryId: body.categoryId || 'other',
        date: body.date || now.split('T')[0],
        isSubscription: body.isSubscription || false,
        subscriptionFrequency: body.subscriptionFrequency,
        createdAt: now,
      };

      const financialData = await getFinancialData();
      financialData.transactions.push(newTransaction);
      await saveFinancialData(financialData);

      return NextResponse.json({ transaction: newTransaction, success: true }, { status: 201 });
    } catch (error) {
      console.error('Quick-add transaction POST error:', error);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }
  }

  // Default: handle as task
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
