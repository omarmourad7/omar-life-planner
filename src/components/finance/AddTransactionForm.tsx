'use client';

import { useState } from 'react';
import { FinancialCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddTransactionFormProps {
  categories: FinancialCategory[];
  onSubmit: (data: {
    amount: number;
    currency: string;
    amountNZD: number;
    description: string;
    categoryId: string;
    date: string;
    isSubscription: boolean;
    subscriptionFrequency?: 'weekly' | 'monthly' | 'yearly';
  }) => Promise<void>;
  onCancel: () => void;
}

export default function AddTransactionForm({ categories, onSubmit, onCancel }: AddTransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [amountNZD, setAmountNZD] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: Number(amount),
        currency,
        amountNZD: currency === 'NZD' ? Number(amount) : Number(amountNZD || amount),
        description,
        categoryId,
        date,
        isSubscription,
        subscriptionFrequency: isSubscription ? subscriptionFrequency : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount + Currency */}
      <div className="space-y-2">
        <Label className="text-xs">Amount</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (currency === 'NZD') setAmountNZD(e.target.value);
              }}
              placeholder="0.00"
              className="pl-7"
              required
              autoFocus
            />
          </div>
          <Select value={currency} onValueChange={(v) => { if (v) { setCurrency(v); if (v === 'NZD') setAmountNZD(amount); } }}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NZD">NZD</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="THB">THB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* NZD equivalent if foreign currency */}
      {currency !== 'NZD' && (
        <div className="space-y-2">
          <Label className="text-xs">NZD Equivalent</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              step="0.01"
              value={amountNZD}
              onChange={(e) => setAmountNZD(e.target.value)}
              placeholder="NZD amount"
              className="pl-7"
              required
            />
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you spend on?"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs">Category</Label>
        <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label className="text-xs">Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Subscription toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSubscription(!isSubscription)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              isSubscription ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                isSubscription ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <Label className="text-xs">Recurring subscription</Label>
        </div>
        {isSubscription && (
          <Select value={subscriptionFrequency} onValueChange={(v) => v && setSubscriptionFrequency(v as 'weekly' | 'monthly' | 'yearly')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !amount || !description} className="flex-1">
          {submitting ? 'Adding...' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  );
}
