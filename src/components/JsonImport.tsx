'use client';

import { useState } from 'react';

interface JsonImportProps {
  onImport: (tasks: unknown[]) => Promise<void>;
}

export default function JsonImport({ onImport }: JsonImportProps) {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = async () => {
    setError('');
    try {
      const data = JSON.parse(jsonText);
      const tasks = Array.isArray(data) ? data : [data];

      // Validate tasks have at least a title
      for (const task of tasks) {
        if (!task.title) {
          throw new Error('Each task must have a title');
        }
      }

      setLoading(true);
      await onImport(tasks);
      setJsonText('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  const exampleJson = `{
  "title": "Example Task",
  "description": "Task description",
  "deadline": "2026-07-20T17:00:00.000Z",
  "priority": "high",
  "categoryId": "work",
  "status": 0
}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        <span>{isOpen ? '▼' : '▶'}</span>
        <span>Import JSON (Claude fallback)</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste JSON from Claude when MCP is unavailable. Accepts single task or array of tasks.
          </p>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={exampleJson}
            className="w-full h-40 px-3 py-2 font-mono text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={loading || !jsonText.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Tasks'}
            </button>
            <button
              onClick={() => setJsonText(exampleJson)}
              className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            >
              Show Example
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
