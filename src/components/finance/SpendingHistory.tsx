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

type ViewMode = 'weeks' | 'months' | 'all';

function CategoryBarChart({
  categorySpending,
  categories,
}: {
  categorySpending: Record<string, number>;
  categories: FinancialCategory[];
}) {
  const sortedCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a);

  if (sortedCategories.length === 0) return null;

  const maxAmount = sortedCategories[0][1];

  const getCatInfo = (id: string) =>
    categories.find(c => c.id === id) || { name: 'Other', color: '#6B7280', icon: '📦' };

  return (
    <div className="space-y-2">
      {sortedCategories.map(([catId, amount]) => {
        const cat = getCatInfo(catId);
        const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

        return (
          <div key={catId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </div>
              <span className="font-semibold">${amount.toFixed(0)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  const allTimeData = useMemo(() => {
    const categorySpending: Record<string, number> = {};
    let total = 0;

    for (const txn of transactions) {
      total += txn.amountNZD;
      categorySpending[txn.categoryId] =
        (categorySpending[txn.categoryId] || 0) + txn.amountNZD;
    }

    return { total, count: transactions.length, categories: categorySpending };
  }, [transactions]);

  const data = viewMode === 'weeks' ? weeklyData : monthlyData;

  const getCatInfo = (id: string) =>
    categories.find(c => c.id === id) || { name: 'Other', color: '#6B7280', icon: '📦' };

  const formatPeriod = (key: string) => {
    if (viewMode === 'months') {
      // Budget month keys are like "2026-Jul"
      const parts = key.split('-');
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
      return key;
    }
    return key;
  };

  // Track which monthly cards are expanded
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const toggleExpanded = (period: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
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
        <Button
          variant={viewMode === 'all' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setViewMode('all')}
        >
          All Time
        </Button>
      </div>

      {/* All Time View */}
      {viewMode === 'all' && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="py-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">${allTimeData.total.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Spent</div>
              </CardContent>
            </Card>
            <Card className="py-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{allTimeData.count}</div>
                <div className="text-xs text-muted-foreground mt-1">Transactions</div>
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown */}
          <Card className="py-0">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Spending by Category</h3>
              <CategoryBarChart
                categorySpending={allTimeData.categories}
                categories={categories}
              />
            </CardContent>
          </Card>

          {allTimeData.count === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No spending history yet
            </p>
          )}
        </div>
      )}

      {/* Weekly / Monthly Data */}
      {viewMode !== 'all' && (
        <div className="space-y-2">
          {data.map(([period, info]) => {
            const periodBudget = viewMode === 'weeks'
              ? getWeeklyBudget(budget, period, new Date())
              : budget.monthlyBudget;
            const percentage = periodBudget > 0 ? Math.min(info.total / periodBudget, 1) : 0;
            const isOver = info.total > periodBudget;
            const isExpanded = expandedPeriods.has(period);

            // Top 3 categories by spend
            const topCats = Object.entries(info.categories)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3);

            return (
              <Card
                key={period}
                className="py-0 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => viewMode === 'months' && toggleExpanded(period)}
              >
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
                  {/* Category breakdown summary */}
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
                    {viewMode === 'months' && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
                  </div>

                  {/* Expanded bar chart for monthly view */}
                  {viewMode === 'months' && isExpanded && (
                    <div className="pt-2 border-t border-border mt-2">
                      <CategoryBarChart
                        categorySpending={info.categories}
                        categories={categories}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode !== 'all' && data.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No spending history yet
        </p>
      )}
    </div>
  );
}
