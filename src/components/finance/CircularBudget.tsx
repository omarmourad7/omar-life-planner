'use client';

import { useMemo } from 'react';

interface CircularBudgetProps {
  spent: number;
  budget: number;
  label: string;
  size?: number;
}

export default function CircularBudget({ spent, budget, label, size = 140 }: CircularBudgetProps) {
  const remaining = Math.max(0, budget - spent);
  const percentage = budget > 0 ? Math.min(spent / budget, 1) : 0;

  const { strokeDasharray, strokeDashoffset, color } = useMemo(() => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percentage);

    // Color transitions: green -> yellow -> orange -> red
    let ringColor: string;
    if (percentage <= 0.5) {
      ringColor = '#22C55E'; // green
    } else if (percentage <= 0.7) {
      ringColor = '#EAB308'; // yellow
    } else if (percentage <= 0.9) {
      ringColor = '#F97316'; // orange
    } else {
      ringColor = '#EF4444'; // red
    }

    return {
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: offset,
      color: ringColor,
    };
  }, [percentage, size]);

  const radius = (size - 12) / 2;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/40"
          />
          {/* Progress circle (shows what's been spent) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              strokeDasharray,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight">
            ${remaining.toFixed(0)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">left</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
