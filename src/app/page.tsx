'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, Category, getTrafficLightColor } from '@/lib/types';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import CategoryManager from '@/components/CategoryManager';
import JsonImport from '@/components/JsonImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortType = 'deadline' | 'priority' | 'status' | 'created';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState<SortType>('deadline');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addedId = params.get('added');
    if (addedId) {
      setSuccessMessage('Task added successfully!');
      window.history.replaceState({}, '', '/');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, catsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/categories'),
      ]);
      const tasksData = await tasksRes.json();
      const catsData = await catsRes.json();
      setTasks(tasksData.tasks || []);
      setCategories(catsData.categories || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTask = async (taskData: Partial<Task>) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (res.ok) { await fetchData(); setShowAddForm(false); }
  };

  const updateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (res.ok) { await fetchData(); setEditingTask(null); }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) { await fetchData(); }
  };

  const updateTaskStatus = async (taskId: string, status: number) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { await fetchData(); }
  };

  const addCategory = async (catData: Partial<Category>) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData),
    });
    if (res.ok) { await fetchData(); }
  };

  const updateCategory = async (cat: Category) => {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (res.ok) { await fetchData(); }
  };

  const deleteCategory = async (catId: string) => {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/categories?id=${catId}`, { method: 'DELETE' });
    if (res.ok) { await fetchData(); }
  };

  const importTasks = async (tasksToImport: unknown[]) => {
    for (const taskData of tasksToImport) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
    }
    await fetchData();
  };

  // Filter and sort
  const filteredTasks = tasks
    .filter((task) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'active') return task.status < 10;
      if (activeTab === 'done') return task.status >= 10;
      return task.categoryId === activeTab;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority':
          const p = { high: 0, medium: 1, low: 2 };
          return p[a.priority] - p[b.priority];
        case 'status':
          return a.status - b.status;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => t.status < 10).length,
    done: tasks.filter((t) => t.status >= 10).length,
    urgent: tasks.filter((t) => getTrafficLightColor(t) === 'red').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile friendly */}
      <header className="sticky top-[49px] z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Tasks</h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Tasks & deadlines</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Sheet */}
            <Sheet>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M6.955 1.45A.5.5 0 0 1 7.452 1h1.096a.5.5 0 0 1 .497.45l.17 1.699c.484.12.94.312 1.356.562l1.321-.916a.5.5 0 0 1 .67.033l.774.775a.5.5 0 0 1 .033.67l-.916 1.32c.25.417.443.873.563 1.357l1.699.17a.5.5 0 0 1 .45.497v1.096a.5.5 0 0 1-.45.497l-1.699.17c-.12.484-.312.94-.562 1.356l.916 1.321a.5.5 0 0 1-.034.67l-.774.774a.5.5 0 0 1-.67.033l-1.32-.916c-.417.25-.873.443-1.357.563l-.17 1.699a.5.5 0 0 1-.497.45H7.452a.5.5 0 0 1-.497-.45l-.17-1.699a4.973 4.973 0 0 1-1.356-.562l-1.321.916a.5.5 0 0 1-.67-.033l-.774-.775a.5.5 0 0 1-.034-.67l.916-1.32a4.971 4.971 0 0 1-.562-1.357l-1.699-.17A.5.5 0 0 1 1 8.548V7.452a.5.5 0 0 1 .45-.497l1.699-.17c.12-.484.312-.94.562-1.356l-.916-1.321a.5.5 0 0 1 .034-.67l.774-.774a.5.5 0 0 1 .67-.033l1.32.916c.417-.25.873-.443 1.357-.563l.17-1.699ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" clipRule="evenodd"/>
                </svg>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <CategoryManager
                    categories={categories}
                    onAdd={addCategory}
                    onUpdate={updateCategory}
                    onDelete={deleteCategory}
                  />
                  <JsonImport onImport={importTasks} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Add Task Button */}
            <Button size="sm" onClick={() => setShowAddForm(true)} className="h-8">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 sm:mr-1">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"/>
              </svg>
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-3">
        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
            {successMessage}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'Active', value: stats.active, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Done', value: stats.done, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Urgent', value: stats.urgent, color: 'text-red-600 dark:text-red-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="py-1.5">
              <CardContent className="p-0 px-2 text-center">
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter + Sort - stacked on mobile */}
        <div className="space-y-3">
          <div className="overflow-x-auto -mx-3 px-3 pb-1">
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'all', label: 'All', color: '' },
                { id: 'active', label: 'Active', color: '' },
                { id: 'done', label: 'Done', color: '' },
                ...categories.map(cat => ({ id: cat.id, label: cat.name, color: cat.color })),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {tab.color && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tab.color }} />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              {filteredTasks.filter(t => getTrafficLightColor(t) === 'red').length > 0 && (
                <span className="text-red-500 ml-2">
                  {filteredTasks.filter(t => getTrafficLightColor(t) === 'red').length} urgent
                </span>
              )}
            </p>
            <Select value={sort} onValueChange={(v) => v && setSort(v as SortType)}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Progress</SelectItem>
                <SelectItem value="created">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task Grid - responsive */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categories.find((c) => c.id === task.categoryId)}
              onEdit={setEditingTask}
              onDelete={deleteTask}
              onStatusChange={updateTaskStatus}
            />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto text-muted-foreground">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">No tasks yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
              Add your first task
            </Button>
          </div>
        )}
      </main>

      {/* Add Task Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <TaskForm categories={categories} onSubmit={addTask} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              categories={categories}
              onSubmit={updateTask}
              initialTask={editingTask}
              onCancel={() => setEditingTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
