import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthRequest extends NextRequest {
  userId?: number;
}

// Note: This middleware is for reference only. 
// Next.js API Routes use getAuthToken() from @/lib/auth instead.
export const authMiddleware = (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: number };
    return decoded;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
};