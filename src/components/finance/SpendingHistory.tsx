'use client';

import { useState, useMemo } from 'react';
import { Transaction, FinancialCategory, getISOWeekString, getMonthString, getWeeklyBudget, Budget } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SpendingHistoryProps {
  transactions: Transaction[];
  categories: FinancialCategory[];
  budget: Budget;
}

type ViewMode = 'weeks' | 'months';

export default function SpendingHistory({ transactions, categories, budget }: SpendingHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { total: number; count: number; categories: Record<string, number> }> = {};

    for (const txn of transactions) {
      const date = new Date(txn.date);
      const weekStr = getISOWeekString(date);
      if (!weeks[weekStr]) {
        weeks[weekStr] = { total: 0, count: 0, categories: {} };
      }
      weeks[weekStr].total += txn.amountNZD;
      weeks[weekStr].count += 1;
      weeks[weekStr].categories[txn.categoryId] =
        (weeks[weekStr].categories[txn.categoryId] || 0) + txn.amountNZD;
    }

    return Object.entries(weeks)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { total: number; count: number; categories: Record<string, number> }> = {};

    for (const txn of transactions) {
      const date = new Date(txn.date);
      const monthStr = getMonthString(date);
      if (!months[monthStr]) {
        months[monthStr] = { total: 0, count: 0, categories: {} };
      }
      months[monthStr].total += txn.amountNZD;
      months[monthStr].count += 1;
      months[monthStr].categories[txn.categoryId] =
        (months[monthStr].categories[txn.categoryId] || 0) + txn.amountNZD;
    }

    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);
  }, [transactions]);

  const data = viewMode === 'weeks' ? weeklyData : monthlyData;

  const getCatInfo = (id: string) =>
    categories.find(c => c.id === id) || { name: 'Other', color: '#6B7280', icon: '📦' };

  const formatPeriod = (key: string) => {
    if (viewMode === 'months') {
      const [year, month] = key.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' });
    }
    return key;
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'weeks' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('weeks')}
        >
          Weekly
        </Button>
        <Button
          variant={viewMode === 'months' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('months')}
        >
          Monthly
        </Button>
      </div>

      {/* Data */}
      <div className="space-y-2">
        {data.map(([period, info]) => {
          const periodBudget = viewMode === 'weeks'
            ? getWeeklyBudget(budget, period, new Date())
            : budget.monthlyBudget;
          const percentage = periodBudget > 0 ? Math.min(info.total / periodBudget, 1) : 0;
          const isOver = info.total > periodBudget;

          // Top 3 categories by spend
          const topCats = Object.entries(info.categories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

          return (
            <Card key={period} className="py-0">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{formatPeriod(period)}</span>
                  <span className={`text-sm font-semibold ${isOver ? 'text-red-500' : ''}`}>
                    ${info.total.toFixed(0)} / ${periodBudget.toFixed(0)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? 'bg-red-500' : percentage > 0.8 ? 'bg-orange-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage * 100}%` }}
                  />
                </div>
                {/* Category breakdown */}
                <div className="flex gap-2 flex-wrap">
                  {topCats.map(([catId, amount]) => {
                    const cat = getCatInfo(catId);
                    return (
                      <span key={catId} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span>{cat.icon}</span>
                        ${amount.toFixed(0)}
                      </span>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground">
                    ({info.count} txns)
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No spending history yet
        </p>
      )}
    </div>
  );
}
