import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getAuthToken } from '@/lib/auth';

const prisma = new PrismaClient();

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

export async function PUT(req: NextRequest) {
  try {
    const userId = getAuthToken(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password if provided
    const updateData: any = {};
    if (newPassword) {
      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.error },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
