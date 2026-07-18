import { NextRequest, NextResponse } from 'next/server';
import { getFinancialData, saveFinancialData } from '@/lib/github-storage';

// GET /api/finance/budget - Get budget settings
export async function GET() {
  try {
    const data = await getFinancialData();
    return NextResponse.json({ budget: data.budget, categories: data.categories });
  } catch (error) {
    console.error('Failed to fetch budget:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
  }
}

// PUT /api/finance/budget - Update budget settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await getFinancialData();

    if (body.monthlyBudget !== undefined) {
      data.budget.monthlyBudget = Number(body.monthlyBudget);
    }

    if (body.weeklyOverrides !== undefined) {
      data.budget.weeklyOverrides = body.weeklyOverrides;
    }

    // Allow setting a single week override
    if (body.weekOverride) {
      const { week, amount } = body.weekOverride;
      if (week && amount !== undefined) {
        if (amount === null) {
          // Remove override
          delete data.budget.weeklyOverrides[week];
        } else {
          data.budget.weeklyOverrides[week] = Number(amount);
        }
      }
    }

    // Allow updating categories
    if (body.categories) {
      data.budget.monthlyBudget = data.budget.monthlyBudget; // keep
      data.categories = body.categories;
    }

    // Allow adding a single category
    if (body.addCategory) {
      data.categories.push(body.addCategory);
    }

    // Allow removing a category
    if (body.removeCategory) {
      data.categories = data.categories.filter(c => c.id !== body.removeCategory);
    }

    await saveFinancialData(data);

    return NextResponse.json({ budget: data.budget, categories: data.categories, success: true });
  } catch (error) {
    console.error('Failed to update budget:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}
