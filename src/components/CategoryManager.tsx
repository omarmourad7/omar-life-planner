'use client';

import { useState } from 'react';
import { Category } from '@/lib/types';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (category: Partial<Category>) => Promise<void>;
  onUpdate: (category: Category) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}

// Predefined colors that don't clash with traffic light (no red, yellow, green)
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Violet
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
];

export default function CategoryManager({ categories, onAdd, onUpdate, onDelete }: CategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await onAdd({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (cat: Category) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await onUpdate({ ...cat, name: editName.trim(), color: editColor });
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Categories</h2>

      {/* Add new category */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
        <div className="relative">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={loading || !newName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Preset colors */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setNewColor(color)}
            className={`w-6 h-6 rounded-full border-2 ${newColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
            {editingId === cat.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <button
                  onClick={() => handleUpdate(cat)}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700"
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1">{cat.name}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="text-gray-500 hover:text-red-600"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
