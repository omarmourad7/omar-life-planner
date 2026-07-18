'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function TopNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: 'Tasks' },
    { href: '/money', label: 'Money' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b safe-top">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-1">
        <div className="flex gap-1 bg-muted rounded-full p-1">
          {tabs.map(tab => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
