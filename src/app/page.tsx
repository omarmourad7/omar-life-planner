'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, Category, getTrafficLightColor } from '@/lib/types';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import CategoryManager from '@/components/CategoryManager';
import JsonImport from '@/components/JsonImport';

type FilterType = 'all' | 'active' | 'completed' | string;
type SortType = 'deadline' | 'priority' | 'status' | 'created';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('deadline');
  const [successMessage, setSuccessMessage] = useState('');

  // Check for quick-add success
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Task operations
  const addTask = async (taskData: Partial<Task>) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (res.ok) {
      await fetchData();
      setShowAddForm(false);
    }
  };

  const updateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (res.ok) {
      await fetchData();
      setEditingTask(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  const updateTaskStatus = async (taskId: string, status: number) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  // Category operations
  const addCategory = async (catData: Partial<Category>) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const updateCategory = async (cat: Category) => {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const deleteCategory = async (catId: string) => {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/categories?id=${catId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  // JSON Import
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

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      if (filter === 'all') return true;
      if (filter === 'active') return task.status < 10;
      if (filter === 'completed') return task.status >= 10;
      return task.categoryId === filter;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'status':
          return a.status - b.status;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => t.status < 10).length,
    completed: tasks.filter((t) => t.status >= 10).length,
    urgent: tasks.filter((t) => getTrafficLightColor(t) === 'red').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Omar Life Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your tasks across work, startup, university, and personal life
          </p>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-gray-500">Urgent</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Task'}
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {showCategories ? 'Hide Categories' : 'Manage Categories'}
          </button>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="all">All Tasks</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <optgroup label="Categories">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>

        {/* Add Task Form */}
        {showAddForm && (
          <div className="mb-6">
            <TaskForm
              categories={categories}
              onSubmit={addTask}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg">
              <TaskForm
                categories={categories}
                onSubmit={updateTask}
                initialTask={editingTask}
                onCancel={() => setEditingTask(null)}
              />
            </div>
          </div>
        )}

        {/* Category Manager */}
        {showCategories && (
          <div className="mb-6">
            <CategoryManager
              categories={categories}
              onAdd={addCategory}
              onUpdate={updateCategory}
              onDelete={deleteCategory}
            />
          </div>
        )}

        {/* JSON Import */}
        <div className="mb-6">
          <JsonImport onImport={importTasks} />
        </div>

        {/* Task Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">No tasks found</p>
            <p>Add a task to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
