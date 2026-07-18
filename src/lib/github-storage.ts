// GitHub JSON storage handler
import { Octokit } from '@octokit/rest';
import { TasksData, CategoriesData, DEFAULT_CATEGORIES, FinancialData, DEFAULT_FINANCIAL_CATEGORIES, DEFAULT_BUDGET } from './types';

const REPO_OWNER = 'omarmourad7';
const REPO_NAME = 'omar-life-planner-data';
const TASKS_FILE = 'tasks.json';
const CATEGORIES_FILE = 'categories.json';
const FINANCE_FILE = 'finance.json';

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return new Octokit({ auth: token });
}

async function getFileContent(filePath: string): Promise<{ content: string; sha: string } | null> {
  const octokit = getOctokit();
  try {
    const response = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
    });

    if ('content' in response.data && 'sha' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return { content, sha: response.data.sha };
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function saveFileContent(filePath: string, content: string, sha?: string): Promise<void> {
  const octokit = getOctokit();
  const message = `Update ${filePath} - ${new Date().toISOString()}`;

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: filePath,
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha && { sha }),
  });
}

// Tasks operations
export async function getTasks(): Promise<TasksData> {
  const file = await getFileContent(TASKS_FILE);
  if (!file) {
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
  return JSON.parse(file.content) as TasksData;
}

export async function saveTasks(data: TasksData): Promise<void> {
  const file = await getFileContent(TASKS_FILE);
  data.lastUpdated = new Date().toISOString();
  await saveFileContent(TASKS_FILE, JSON.stringify(data, null, 2), file?.sha);
}

// Categories operations
export async function getCategories(): Promise<CategoriesData> {
  const file = await getFileContent(CATEGORIES_FILE);
  if (!file) {
    // Return default categories if file doesn't exist
    return {
      categories: DEFAULT_CATEGORIES,
      lastUpdated: new Date().toISOString()
    };
  }
  return JSON.parse(file.content) as CategoriesData;
}

export async function saveCategories(data: CategoriesData): Promise<void> {
  const file = await getFileContent(CATEGORIES_FILE);
  data.lastUpdated = new Date().toISOString();
  await saveFileContent(CATEGORIES_FILE, JSON.stringify(data, null, 2), file?.sha);
}

// Financial data operations
export async function getFinancialData(): Promise<FinancialData> {
  const file = await getFileContent(FINANCE_FILE);
  if (!file) {
    return {
      transactions: [],
      budget: { ...DEFAULT_BUDGET },
      categories: [...DEFAULT_FINANCIAL_CATEGORIES],
      lastUpdated: new Date().toISOString(),
    };
  }
  return JSON.parse(file.content) as FinancialData;
}

export async function saveFinancialData(data: FinancialData): Promise<void> {
  const file = await getFileContent(FINANCE_FILE);
  data.lastUpdated = new Date().toISOString();
  await saveFileContent(FINANCE_FILE, JSON.stringify(data, null, 2), file?.sha);
}
