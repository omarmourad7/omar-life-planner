'use client';

import { useState } from 'react';
import { Task, Category, NotificationSettings, DEFAULT_NOTIFICATIONS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskFormProps {
  categories: Category[];
  onSubmit: (task: Partial<Task>) => Promise<void>;
  initialTask?: Task;
  onCancel?: () => void;
}

export default function TaskForm({ categories, onSubmit, initialTask, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [deadline, setDeadline] = useState(
    initialTask?.deadline ? new Date(initialTask.deadline).toISOString().slice(0, 16) : ''
  );
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(initialTask?.priority || 'medium');
  const [categoryId, setCategoryId] = useState(initialTask?.categoryId || categories[0]?.id || 'personal');
  const [status, setStatus] = useState(initialTask?.status ?? 0);
  const [notifications, setNotifications] = useState<NotificationSettings>(
    initialTask?.notifications || { ...DEFAULT_NOTIFICATIONS }
  );
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
        categoryId,
        status,
        notifications,
      });
      if (!initialTask) {
        setTitle('');
        setDescription('');
        setDeadline('');
        setPriority('medium');
        setStatus(0);
        setNotifications({ ...DEFAULT_NOTIFICATIONS });
      }
    } finally {
      setLoading(false);
    }
  };

  const notificationLabels: Record<keyof NotificationSettings, string> = {
    '3d': '3 days',
    '2d': '2 days',
    '24h': '24 hrs',
    '18h': '18 hrs',
    '12h': '12 hrs',
    '6h': '6 hrs',
    '2h': '2 hrs',
    '1h': '1 hr',
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{initialTask ? 'Edit Task' : 'New Task'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v as 'high' | 'medium' | 'low')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Progress: {status}/10</Label>
              <Slider
                value={[status]}
                onValueChange={(v) => setStatus(Array.isArray(v) ? v[0] : v)}
                min={0}
                max={10}
                step={1}
                className="mt-3"
              />
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-muted-foreground px-0 hover:bg-transparent"
            >
              {showNotifications ? '▾' : '▸'} Reminder settings
            </Button>

            {showNotifications && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-3">
                  Calendar reminders before deadline
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(notifications) as Array<keyof NotificationSettings>).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={notifications[key]}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, [key]: !!checked })
                        }
                      />
                      {notificationLabels[key]}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : initialTask ? 'Update' : 'Add Task'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
