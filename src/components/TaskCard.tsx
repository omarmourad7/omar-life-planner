'use client';

import { Task, Category, getTrafficLightColor, getStatusLabel } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

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

  const trafficLightStyles = {
    red: 'border-l-red-500 dark:border-l-red-400',
    orange: 'border-l-orange-500 dark:border-l-orange-400',
    yellow: 'border-l-amber-500 dark:border-l-amber-400',
    green: 'border-l-emerald-500 dark:border-l-emerald-400',
    gray: 'border-l-gray-300 dark:border-l-gray-600',
  };

  const trafficLightDot = {
    red: 'bg-red-500 shadow-red-500/50',
    orange: 'bg-orange-500 shadow-orange-500/50',
    yellow: 'bg-amber-500 shadow-amber-500/50',
    green: 'bg-emerald-500 shadow-emerald-500/50',
    gray: 'bg-gray-400',
  };

  const progressColors = {
    red: '[&>div]:bg-red-500',
    orange: '[&>div]:bg-orange-500',
    yellow: '[&>div]:bg-amber-500',
    green: '[&>div]:bg-emerald-500',
    gray: '[&>div]:bg-gray-400',
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (diff < 0) return { text: 'Overdue', urgent: true };
    if (hours < 6) return { text: `${hours}h left`, urgent: true };
    if (hours < 24) return { text: `${hours}h left`, urgent: true };
    if (days === 1) return { text: 'Tomorrow', urgent: false };
    if (days < 7) return { text: `${days}d left`, urgent: false };
    return { text: date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }), urgent: false };
  };

  const deadlineInfo = formatDeadline(task.deadline);

  return (
    <Card className={`border-l-4 ${trafficLightStyles[trafficLight]} transition-all hover:shadow-md active:scale-[0.98]`}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm ${trafficLightDot[trafficLight]}`} />
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</h3>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.84 9.686a2.5 2.5 0 0 0-.65 1.11l-.63 2.521a.5.5 0 0 0 .61.61l2.521-.63a2.5 2.5 0 0 0 1.11-.65l7.173-7.173a1.75 1.75 0 0 0 0-2.475l-.487-.487Z"/>
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd"/>
              </svg>
            </Button>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-muted-foreground text-xs mb-3 line-clamp-2 ml-4.5">
            {task.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {category && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 text-white" style={{ backgroundColor: category.color }}>
              {category.name}
            </Badge>
          )}
          <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className="text-[10px] px-2 py-0">
            {task.priority}
          </Badge>
          {deadlineInfo && (
            <Badge variant={deadlineInfo.urgent ? 'destructive' : 'secondary'} className="text-[10px] px-2 py-0">
              {deadlineInfo.text}
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{statusLabel}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{task.status * 10}%</span>
          </div>
          <Progress value={task.status * 10} className={`h-1.5 ${progressColors[trafficLight]}`} />

          {/* Quick status buttons */}
          <div className="flex gap-1 pt-1">
            {[0, 2, 4, 6, 8, 10].map((val) => (
              <button
                key={val}
                onClick={() => onStatusChange(task.id, val)}
                className={`flex-1 h-6 text-[10px] rounded-md font-medium transition-colors ${
                  task.status === val
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-muted-foreground'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
