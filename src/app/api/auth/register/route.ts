import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Passwort-Validierungsfunktion
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Passwort muss mindestens 8 Zeichen lang sein' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Großbuchstaben enthalten' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Kleinbuchstaben enthalten' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens eine Ziffer enthalten' };
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Benutzername und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Benutzername-Länge validieren
    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: 'Benutzername muss zwischen 3 und 50 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // Passwort validieren
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Benutzername existiert bereits' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
