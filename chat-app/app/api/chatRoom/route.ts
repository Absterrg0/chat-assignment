import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";



export async function GET(request: NextRequest) {


    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');

    if (!groupId) {
        return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const group = await prisma.chatRoom.findUnique({
        where: { id: groupId },
    });

    if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
}




export async function POST(request: NextRequest) {
    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
        return NextResponse.json(
            { error: 'Name and password are required' },
            { status: 400 }
        );
    }

    const chatRoom = await prisma.chatRoom.create({
        data: {
            name,
            password,
        },
    });

    return NextResponse.json({
        roomId: chatRoom.id,
    });
}

