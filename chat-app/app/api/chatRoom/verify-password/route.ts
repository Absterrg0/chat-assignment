import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { roomId, password } = await request.json();

    if (!roomId || !password) {
      return NextResponse.json(
        { error: 'Room ID and password are required' },
        { status: 400 }
      );
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { password: true }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const isValid = room.password === password;

    return NextResponse.json({
      status: isValid ? 'success' : 'error',
      message: isValid ? 'Password is valid' : 'Invalid password'
    });

  } catch (error) {
    console.error('Error verifying room password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 