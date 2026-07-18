'use client';

import { useState } from 'react';
import { Budget, FinancialCategory, getISOWeekString, getWeeksInMonth, getMonthString, getWeeklyBudget } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface BudgetSettingsProps {
  budget: Budget;
  categories: FinancialCategory[];
  onSaveBudget: (budget: Partial<Budget> & { weekOverride?: { week: string; amount: number | null } }) => Promise<void>;
  onAddCategory: (cat: FinancialCategory) => Promise<void>;
  onRemoveCategory: (id: string) => Promise<void>;
}

export default function BudgetSettings({
  budget,
  categories,
  onSaveBudget,
  onAddCategory,
  onRemoveCategory,
}: BudgetSettingsProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(budget.monthlyBudget.toString());
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');

  const now = new Date();
  const currentMonth = getMonthString(now);
  const currentWeek = getISOWeekString(now);
  const weeksInMonth = getWeeksInMonth(currentMonth);

  const handleSaveMonthly = async () => {
    setSaving(true);
    try {
      await onSaveBudget({ monthlyBudget: Number(monthlyBudget) });
    } finally {
      setSaving(false);
    }
  };

  const handleWeekOverride = async (week: string, amount: string) => {
    if (!amount || amount === '') {
      await onSaveBudget({ weekOverride: { week, amount: null } });
    } else {
      await onSaveBudget({ weekOverride: { week, amount: Number(amount) } });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const colors = ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#F43F5E'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await onAddCategory({ id, name: newCatName, color, icon: newCatIcon || '📌' });
    setNewCatName('');
    setNewCatIcon('');
  };

  return (
    <div className="space-y-6 p-1">
      {/* Monthly Budget */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Monthly Budget</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="pl-7"
              placeholder="2000"
            />
          </div>
          <Button onClick={handleSaveMonthly} disabled={saving} size="default">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Base weekly: ${(Number(monthlyBudget) / 4).toFixed(0)}/week
        </p>
      </div>

      {/* Weekly Overrides */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Weekly Budgets - {currentMonth}</h3>
        <p className="text-xs text-muted-foreground">
          Adjust individual weeks. Remaining weeks auto-balance.
        </p>
        <div className="space-y-2">
          {weeksInMonth.map(week => {
            const weekBudget = getWeeklyBudget(budget, week, now);
            const isOverridden = budget.weeklyOverrides[week] !== undefined;
            const isCurrent = week === currentWeek;

            return (
              <Card key={week} className={`py-0 ${isCurrent ? 'border-primary/50' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-medium">
                      {week}
                      {isCurrent && <span className="text-primary ml-1">(current)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <Input
                        type="number"
                        defaultValue={isOverridden ? budget.weeklyOverrides[week].toString() : ''}
                        placeholder={weekBudget.toFixed(0)}
                        className="pl-5 h-7 text-xs"
                        onBlur={(e) => handleWeekOverride(week, e.target.value)}
                      />
                    </div>
                    {isOverridden && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleWeekOverride(week, '')}
                        className="text-muted-foreground"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                        </svg>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Spending Categories</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
              <span>{cat.icon}</span>
              <span className="text-sm flex-1">{cat.name}</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {!['food', 'transport', 'subscriptions', 'entertainment', 'travel', 'rent-bills', 'shopping', 'other'].includes(cat.id) && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemoveCategory(cat.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
                  </svg>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add custom category */}
        <div className="space-y-2">
          <Label className="text-xs">Add Custom Category</Label>
          <div className="flex gap-2">
            <Input
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              placeholder="📌"
              className="w-12 text-center"
              maxLength={2}
            />
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="flex-1"
            />
            <Button onClick={handleAddCategory} size="default" disabled={!newCatName.trim()}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
