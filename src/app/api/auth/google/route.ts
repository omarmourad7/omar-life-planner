// GET /api/auth/google - Initiates Google OAuth flow
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    return NextResponse.json({ error: 'Failed to start OAuth flow' }, { status: 500 });
  }
}
