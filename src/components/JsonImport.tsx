'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JsonImportProps {
  onImport: (tasks: unknown[]) => Promise<void>;
}

export default function JsonImport({ onImport }: JsonImportProps) {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setError('');
    try {
      const data = JSON.parse(jsonText);
      const tasks = Array.isArray(data) ? data : [data];
      for (const task of tasks) {
        if (!task.title) throw new Error('Each task must have a title');
      }
      setLoading(true);
      await onImport(tasks);
      setJsonText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  const example = `{"title":"Example","priority":"high","categoryId":"work","deadline":"2026-07-20T17:00:00Z"}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Import JSON</CardTitle>
        <p className="text-xs text-muted-foreground">Paste task JSON from Claude when MCP is unavailable</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={example}
          className="font-mono text-xs h-32 resize-none"
        />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={loading || !jsonText.trim()} size="sm" className="flex-1">
            {loading ? 'Importing...' : 'Import'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setJsonText(example)}>
            Example
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
