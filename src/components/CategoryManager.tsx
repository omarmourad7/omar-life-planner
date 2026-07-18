'use client';

import { useState } from 'react';
import { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (category: Partial<Category>) => Promise<void>;
  onUpdate: (category: Category) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899',
  '#F97316', '#6366F1', '#14B8A6', '#A855F7',
  '#0EA5E9', '#D946EF',
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-9 rounded-md cursor-pointer border"
          />
          <Button onClick={handleAdd} disabled={loading || !newName.trim()} size="sm">
            Add
          </Button>
        </div>

        {/* Color presets */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setNewColor(color)}
              className={`w-5 h-5 rounded-full transition-transform ${newColor === color ? 'ring-2 ring-ring ring-offset-2 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* List */}
        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted group">
              {editingId === cat.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat)}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(cat)} disabled={loading}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-emerald-600"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd"/></svg>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.84 9.686a2.5 2.5 0 0 0-.65 1.11l-.63 2.521a.5.5 0 0 0 .61.61l2.521-.63a2.5 2.5 0 0 0 1.11-.65l7.173-7.173a1.75 1.75 0 0 0 0-2.475l-.487-.487Z"/></svg>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onDelete(cat.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
