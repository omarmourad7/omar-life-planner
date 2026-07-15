'use client';

import { useState } from 'react';
import { Task, Category, NotificationSettings, DEFAULT_NOTIFICATIONS } from '@/lib/types';

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
        // Reset form for new tasks
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
    '3d': '3 days before',
    '2d': '2 days before',
    '24h': '24 hours before',
    '18h': '18 hours before',
    '12h': '12 hours before',
    '6h': '6 hours before',
    '2h': '2 hours before',
    '1h': '1 hour before',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          placeholder="Task title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          placeholder="Task description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status (1-10)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="10"
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 text-center font-mono">{status}</span>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showNotifications ? '▼ Hide' : '▶ Show'} Notification Settings
        </button>

        {showNotifications && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Reminders will be sent to your Google Calendar
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(notifications) as Array<keyof NotificationSettings>).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [key]: e.target.checked })
                    }
                    className="rounded"
                  />
                  {notificationLabels[key]}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : initialTask ? 'Update Task' : 'Add Task'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
