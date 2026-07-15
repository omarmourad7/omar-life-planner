'use client';

import { Task, Category, getTrafficLightColor, getStatusLabel } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  category?: Category;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: number) => void;
}

export default function TaskCard({ task, category, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const trafficLight = getTrafficLightColor(task);
  const statusLabel = getStatusLabel(task.status);

  const trafficLightColors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    gray: 'bg-gray-400',
  };

  const priorityBadge = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (diff < 0) return 'Overdue';
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hours left`;
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days left`;
    return date.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4" style={{ borderLeftColor: trafficLightColors[trafficLight].replace('bg-', '#').replace('-500', '') }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Traffic Light Indicator */}
          <div className={`w-3 h-3 rounded-full ${trafficLightColors[trafficLight]}`} title={`Status: ${statusLabel}`} />
          <h3 className="font-semibold text-lg">{task.title}</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Category Badge */}
        {category && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </span>
        )}

        {/* Priority Badge */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge[task.priority]}`}>
          {task.priority}
        </span>

        {/* Deadline */}
        {task.deadline && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            📅 {formatDeadline(task.deadline)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">{statusLabel}</span>
          <span className="font-mono">{task.status}/10</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${trafficLightColors[trafficLight]}`}
            style={{ width: `${task.status * 10}%` }}
          />
        </div>
        {/* Quick status buttons */}
        <div className="flex justify-between mt-2">
          {[0, 2, 4, 6, 8, 10].map((val) => (
            <button
              key={val}
              onClick={() => onStatusChange(task.id, val)}
              className={`w-8 h-6 text-xs rounded ${
                task.status === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
