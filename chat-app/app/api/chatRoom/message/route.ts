// File: app/api/chatRoom/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const { content, senderId, roomId } = body;
    
    if (!content || !senderId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Store the message in the database
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        chatRoomId: roomId,
      },
    });
    
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error storing message:', error);
    return NextResponse.json(
      { error: 'Failed to store message' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
    try {
      // Get the roomId from the query parameters
      const searchParams = request.nextUrl.searchParams;
      const roomId = searchParams.get('roomId');
      
      if (!roomId) {
        return NextResponse.json(
          { error: 'Room ID is required' },
          { status: 400 }
        );
      }
      
      // Fetch messages for the specified room, ordered by timestamp
      const messages = await prisma.message.findMany({
        where: {
          chatRoomId: roomId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      
      return NextResponse.json({ success: true, messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
  }