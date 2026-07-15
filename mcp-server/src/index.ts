#!/usr/bin/env node
/**
 * Omar Life Planner MCP Server
 *
 * This MCP server allows Claude Desktop to manage tasks in Omar Life Planner.
 * It communicates with the Vercel-hosted API.
 *
 * Tools:
 * - add_task: Create a new task
 * - list_tasks: List all tasks with optional filtering
 * - update_task: Update an existing task
 * - delete_task: Delete a task
 * - list_categories: List all available categories
 * - get_quick_add_url: Generate a URL for Claude mobile to add tasks
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Configuration - update these for your deployment
const API_BASE_URL = process.env.API_BASE_URL || 'https://omar-life-planner.vercel.app';
const QUICK_ADD_SECRET = process.env.QUICK_ADD_SECRET || '';

// Zod schemas for validation
const AddTaskSchema = z.object({
  title: z.string().describe('Task title (required)'),
  description: z.string().optional().describe('Task description'),
  deadline: z.string().optional().describe('Deadline in ISO format (e.g., 2026-07-20T17:00:00.000Z)'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Task priority'),
  categoryId: z.string().optional().describe('Category ID (work, startup, university, personal, or custom)'),
  status: z.number().min(0).max(10).optional().default(0).describe('Status 0-10 (0=not started, 10=done)'),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().describe('Task ID to update'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  deadline: z.string().optional().describe('New deadline in ISO format'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('New priority'),
  categoryId: z.string().optional().describe('New category ID'),
  status: z.number().min(0).max(10).optional().describe('New status 0-10'),
});

const ListTasksSchema = z.object({
  categoryId: z.string().optional().describe('Filter by category ID'),
  status: z.enum(['active', 'completed', 'all']).optional().default('all').describe('Filter by status'),
});

const DeleteTaskSchema = z.object({
  taskId: z.string().describe('Task ID to delete'),
});

const QuickAddSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  deadline: z.string().optional().describe('Deadline in ISO format'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority'),
  categoryId: z.string().optional().describe('Category ID'),
});

// Tool definitions
const tools: Tool[] = [
  {
    name: 'add_task',
    description: 'Add a new task to Omar Life Planner. Returns the created task with its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        description: { type: 'string', description: 'Task description' },
        deadline: { type: 'string', description: 'Deadline in ISO format (e.g., 2026-07-20T17:00:00.000Z)' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority (default: medium)' },
        categoryId: { type: 'string', description: 'Category: work, startup, university, personal, or custom ID' },
        status: { type: 'number', description: 'Status 0-10 (0=not started, 10=done, default: 0)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks from Omar Life Planner. Can filter by category or status.',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'Filter by category ID' },
        status: { type: 'string', enum: ['active', 'completed', 'all'], description: 'Filter: active (status<10), completed (status=10), or all' },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Only provide fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update (required)' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        deadline: { type: 'string', description: 'New deadline in ISO format' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'New priority' },
        categoryId: { type: 'string', description: 'New category ID' },
        status: { type: 'number', description: 'New status 0-10' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to delete' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all available task categories.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_quick_add_url',
    description: 'Generate a tappable URL for Claude mobile to add a task. User taps the URL and the task is added.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        description: { type: 'string', description: 'Task description' },
        deadline: { type: 'string', description: 'Deadline in ISO format' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority' },
        categoryId: { type: 'string', description: 'Category ID' },
      },
      required: ['title'],
    },
  },
];

// API helper
async function apiRequest(endpoint: string, method: string = 'GET', body?: unknown): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }
  return response.json();
}

// Create server
const server = new Server(
  { name: 'omar-life-planner', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_task': {
        const validated = AddTaskSchema.parse(args);
        const result = await apiRequest('/api/tasks', 'POST', validated);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_tasks': {
        const validated = ListTasksSchema.parse(args);
        const result = await apiRequest('/api/tasks') as { tasks: Array<{ status: number; categoryId: string }> };
        let tasks = result.tasks || [];

        // Apply filters
        if (validated.status === 'active') {
          tasks = tasks.filter((t) => t.status < 10);
        } else if (validated.status === 'completed') {
          tasks = tasks.filter((t) => t.status >= 10);
        }
        if (validated.categoryId) {
          tasks = tasks.filter((t) => t.categoryId === validated.categoryId);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ tasks, count: tasks.length }, null, 2) }],
        };
      }

      case 'update_task': {
        const validated = UpdateTaskSchema.parse(args);
        const { taskId, ...updates } = validated;
        const result = await apiRequest(`/api/tasks/${taskId}`, 'PUT', updates);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'delete_task': {
        const validated = DeleteTaskSchema.parse(args);
        const result = await apiRequest(`/api/tasks/${validated.taskId}`, 'DELETE');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_categories': {
        const result = await apiRequest('/api/categories');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_quick_add_url': {
        const validated = QuickAddSchema.parse(args);

        if (!QUICK_ADD_SECRET) {
          return {
            content: [{ type: 'text', text: 'Error: QUICK_ADD_SECRET not configured in MCP server' }],
            isError: true,
          };
        }

        const data = Buffer.from(JSON.stringify(validated)).toString('base64');
        const url = `${API_BASE_URL}/api/quick-add?token=${QUICK_ADD_SECRET}&data=${data}`;

        return {
          content: [{
            type: 'text',
            text: `Tap this link to add the task:\n\n${url}\n\nTask details:\n- Title: ${validated.title}\n- Priority: ${validated.priority || 'medium'}\n- Category: ${validated.categoryId || 'personal'}${validated.deadline ? `\n- Deadline: ${validated.deadline}` : ''}`,
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Omar Life Planner MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
