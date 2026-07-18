import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getFinancialData, saveFinancialData } from '@/lib/github-storage';
import { Transaction } from '@/lib/types';

// GET /api/finance/transactions - Get all transactions (with optional date filtering)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // e.g. "2026-07"
    const week = searchParams.get('week'); // e.g. "2026-W29"

    const data = await getFinancialData();
    let transactions = data.transactions;

    // Filter by month if provided
    if (month) {
      transactions = transactions.filter(t => t.date.startsWith(month));
    }

    // Filter by ISO week if provided
    if (week) {
      const [yearStr, weekStr] = week.split('-W');
      const year = parseInt(yearStr);
      const weekNum = parseInt(weekStr);

      // Calculate the Monday of this ISO week
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const mondayOfWeek1 = new Date(jan4);
      mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);

      const weekStart = new Date(mondayOfWeek1);
      weekStart.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      transactions = transactions.filter(t => t.date >= startStr && t.date <= endStr);
    }

    // Sort by date descending (most recent first)
    transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      transactions,
      budget: data.budget,
      categories: data.categories,
    });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/finance/transactions - Add a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.amount || !body.description) {
      return NextResponse.json(
        { error: 'Amount and description are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      id: body.id || uuidv4(),
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

    const data = await getFinancialData();
    data.transactions.push(newTransaction);
    await saveFinancialData(data);

    return NextResponse.json({ transaction: newTransaction, success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to add transaction:', error);
    return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
  }
}

// DELETE /api/finance/transactions - Delete a transaction by id
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const data = await getFinancialData();
    data.transactions = data.transactions.filter(t => t.id !== id);
    await saveFinancialData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
