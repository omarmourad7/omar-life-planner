'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Transaction,
  FinancialCategory,
  Budget,
  getISOWeekString,
  getMonthString,
  getWeeklyBudget,
  getWeekStart,
  getWeekEnd,
  isDateInBudgetMonth,
  formatBudgetWeek,
  formatBudgetMonth,
} from '@/lib/types';
import CircularBudget from '@/components/finance/CircularBudget';
import TransactionList from '@/components/finance/TransactionList';
import AddTransactionForm from '@/components/finance/AddTransactionForm';
import BudgetSettings from '@/components/finance/BudgetSettings';
import SpendingHistory from '@/components/finance/SpendingHistory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Tab = 'overview' | 'history' | 'subscriptions';

export default function MoneyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [budget, setBudget] = useState<Budget>({ monthlyBudget: 2000, weeklyOverrides: {} });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const added = params.get('added_txn');
    if (added) {
      setSuccessMessage('Transaction added!');
      window.history.replaceState({}, '', '/money');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [currentRes, allRes] = await Promise.all([
        fetch('/api/finance/transactions'),
        fetch('/api/finance/transactions'),
      ]);
      const currentData = await currentRes.json();
      const allData = await allRes.json();

      setTransactions(currentData.transactions || []);
      setAllTransactions(allData.transactions || []);
      setBudget(currentData.budget || { monthlyBudget: 2000, weeklyOverrides: {} });
      setCategories(currentData.categories || []);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const currentWeek = getISOWeekString(now);
  const currentMonth = getMonthString(now);
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Calculate spending
  const weekSpent = useMemo(() => {
    return transactions
      .filter(t => t.date >= weekStartStr && t.date <= weekEndStr)
      .reduce((sum, t) => sum + t.amountNZD, 0);
  }, [transactions, weekStartStr, weekEndStr]);

  const monthSpent = useMemo(() => {
    return transactions
      .filter(t => isDateInBudgetMonth(t.date, now))
      .reduce((sum, t) => sum + t.amountNZD, 0);
  }, [transactions]);

  const weeklyBudget = getWeeklyBudget(budget, currentWeek, now);

  // Subscriptions
  const subscriptions = useMemo(() => {
    return transactions.filter(t => t.isSubscription);
  }, [transactions]);

  const monthlySubscriptionTotal = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    for (const sub of subscriptions) {
      const key = `${sub.description}-${sub.categoryId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (sub.subscriptionFrequency === 'weekly') total += sub.amountNZD * 4;
      else if (sub.subscriptionFrequency === 'yearly') total += sub.amountNZD / 12;
      else total += sub.amountNZD;
    }
    return total;
  }, [subscriptions]);

  // Recent transactions for the overview
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 20);
  }, [transactions]);

  const addTransaction = async (data: {
    amount: number;
    currency: string;
    amountNZD: number;
    description: string;
    categoryId: string;
    date: string;
    isSubscription: boolean;
    subscriptionFrequency?: 'weekly' | 'monthly' | 'yearly';
  }) => {
    const res = await fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchData();
      setShowAddForm(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/finance/transactions?id=${id}`, { method: 'DELETE' });
    if (res.ok) await fetchData();
  };

  const saveBudget = async (budgetUpdate: Partial<Budget> & { weekOverride?: { week: string; amount: number | null } }) => {
    const res = await fetch('/api/finance/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budgetUpdate),
    });
    if (res.ok) await fetchData();
  };

  const addCategory = async (cat: FinancialCategory) => {
    const res = await fetch('/api/finance/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addCategory: cat }),
    });
    if (res.ok) await fetchData();
  };

  const removeCategory = async (id: string) => {
    const res = await fetch('/api/finance/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeCategory: id }),
    });
    if (res.ok) await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading finances...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b safe-top">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Money</h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Budget & spending</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Sheet */}
            <Sheet>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M6.955 1.45A.5.5 0 0 1 7.452 1h1.096a.5.5 0 0 1 .497.45l.17 1.699c.484.12.94.312 1.356.562l1.321-.916a.5.5 0 0 1 .67.033l.774.775a.5.5 0 0 1 .033.67l-.916 1.32c.25.417.443.873.563 1.357l1.699.17a.5.5 0 0 1 .45.497v1.096a.5.5 0 0 1-.45.497l-1.699.17c-.12.484-.312.94-.562 1.356l.916 1.321a.5.5 0 0 1-.034.67l-.774.774a.5.5 0 0 1-.67.033l-1.32-.916c-.417.25-.873.443-1.357.563l-.17 1.699a.5.5 0 0 1-.497.45H7.452a.5.5 0 0 1-.497-.45l-.17-1.699a4.973 4.973 0 0 1-1.356-.562l-1.321.916a.5.5 0 0 1-.67-.033l-.774-.775a.5.5 0 0 1-.034-.67l.916-1.32a4.971 4.971 0 0 1-.562-1.357l-1.699-.17A.5.5 0 0 1 1 8.548V7.452a.5.5 0 0 1 .45-.497l1.699-.17c.12-.484.312-.94.562-1.356l-.916-1.321a.5.5 0 0 1 .034-.67l.774-.774a.5.5 0 0 1 .67-.033l1.32.916c.417-.25.873-.443 1.357-.563l.17-1.699ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" clipRule="evenodd"/>
                </svg>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Budget Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <BudgetSettings
                    budget={budget}
                    categories={categories}
                    onSaveBudget={saveBudget}
                    onAddCategory={addCategory}
                    onRemoveCategory={removeCategory}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Add Transaction Button */}
            <Button size="sm" onClick={() => setShowAddForm(true)} className="h-8">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 sm:mr-1">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
              </svg>
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
            {successMessage}
          </div>
        )}

        {/* Sub-navigation */}
        <div className="overflow-x-auto -mx-3 px-3 pb-1">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'overview' as Tab, label: 'Overview' },
              { id: 'history' as Tab, label: 'History' },
              { id: 'subscriptions' as Tab, label: 'Subscriptions' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Budget Circles */}
            <div className="flex justify-center gap-8 py-4">
              <CircularBudget
                spent={weekSpent}
                budget={weeklyBudget}
                label="This Week"
                size={140}
              />
              <CircularBudget
                spent={monthSpent}
                budget={budget.monthlyBudget}
                label="This Month"
                size={140}
              />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold">${weekSpent.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Week Spent</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold">${monthSpent.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Month Spent</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold">${monthlySubscriptionTotal.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Subs/mo</div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h2 className="text-sm font-semibold mb-3">Recent Transactions</h2>
              <TransactionList
                transactions={recentTransactions}
                categories={categories}
                onDelete={deleteTransaction}
              />
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <SpendingHistory
            transactions={allTransactions}
            categories={categories}
            budget={budget}
          />
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">${monthlySubscriptionTotal.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Monthly subscription cost</div>
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No subscriptions tracked yet. Mark a transaction as recurring when adding it.
              </p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Deduplicate subscriptions by description
                  const seen = new Map<string, Transaction>();
                  for (const sub of subscriptions) {
                    const key = `${sub.description}-${sub.categoryId}`;
                    if (!seen.has(key) || sub.date > (seen.get(key)?.date || '')) {
                      seen.set(key, sub);
                    }
                  }
                  return Array.from(seen.values()).map(sub => {
                    const cat = categories.find(c => c.id === sub.categoryId) || { name: 'Other', color: '#6B7280', icon: '📦' };
                    const monthlyAmount = sub.subscriptionFrequency === 'weekly'
                      ? sub.amountNZD * 4
                      : sub.subscriptionFrequency === 'yearly'
                      ? sub.amountNZD / 12
                      : sub.amountNZD;

                    return (
                      <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                        <span className="text-lg">{cat.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sub.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            ${sub.amountNZD.toFixed(2)} / {sub.subscriptionFrequency}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">${monthlyAmount.toFixed(2)}/mo</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <AddTransactionForm
            categories={categories}
            onSubmit={addTransaction}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
