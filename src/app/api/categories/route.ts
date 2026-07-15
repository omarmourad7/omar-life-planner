// GET /api/categories - List all categories
// POST /api/categories - Create new category
// PUT /api/categories - Update category
// DELETE /api/categories - Delete category

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCategories, saveCategories } from '@/lib/github-storage';
import { Category } from '@/lib/types';

export async function GET() {
  try {
    const data = await getCategories();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newCategory: Category = {
      id: body.id || uuidv4(),
      name: body.name,
      color: body.color || '#6B7280', // Default gray
    };

    const data = await getCategories();

    // Check for duplicate name
    if (data.categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    data.categories.push(newCategory);
    await saveCategories(data);

    return NextResponse.json({ category: newCategory, success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const data = await getCategories();
    const categoryIndex = data.categories.findIndex(c => c.id === body.id);

    if (categoryIndex === -1) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updatedCategory: Category = {
      ...data.categories[categoryIndex],
      ...(body.name && { name: body.name }),
      ...(body.color && { color: body.color }),
    };

    data.categories[categoryIndex] = updatedCategory;
    await saveCategories(data);

    return NextResponse.json({ category: updatedCategory, success: true });
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const data = await getCategories();
    const categoryIndex = data.categories.findIndex(c => c.id === id);

    if (categoryIndex === -1) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    data.categories.splice(categoryIndex, 1);
    await saveCategories(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
