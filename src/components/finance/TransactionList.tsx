'use client';

import { Transaction, FinancialCategory } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TransactionListProps {
  transactions: Transaction[];
  categories: FinancialCategory[];
  onDelete?: (id: string) => void;
}

export default function TransactionList({ transactions, categories, onDelete }: TransactionListProps) {
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { name: 'Other', color: '#6B7280', icon: '📦' };
  };

  const groupByDate = (txns: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    for (const txn of txns) {
      if (!groups[txn.date]) groups[txn.date] = [];
      groups[txn.date].push(txn);
    }
    return groups;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-NZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const grouped = groupByDate(transactions);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-sm">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map(date => (
        <div key={date}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">{formatDate(date)}</span>
            <span className="text-xs text-muted-foreground">
              -${grouped[date].reduce((sum, t) => sum + t.amountNZD, 0).toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5">
            {grouped[date].map(txn => {
              const cat = getCategoryInfo(txn.categoryId);
              return (
                <Card key={txn.id} className="py-0">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-lg shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{txn.description}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: cat.color + '20', color: cat.color }}
                        >
                          {cat.name}
                        </span>
                        {txn.isSubscription && (
                          <span className="text-[10px] text-muted-foreground">
                            {txn.subscriptionFrequency}
                          </span>
                        )}
                        {txn.currency !== 'NZD' && (
                          <span className="text-[10px] text-muted-foreground">
                            {txn.currency} {txn.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      <span className="text-sm font-semibold">
                        -${txn.amountNZD.toFixed(2)}
                      </span>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onDelete(txn.id)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-destructive ml-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5Z" clipRule="evenodd"/>
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
      ))}
    </div>
  );
}
