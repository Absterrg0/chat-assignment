import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    }); 

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}




export async function POST(request: NextRequest) {
    const body = await request.json();
    const { name } = body;

    // Check if user with this name already exists
    const existingUser = await prisma.user.findFirst({
        where: { name },
    });

    if (existingUser) {
        return NextResponse.json({
            status: "success",
            message: "User has signed in",
            user: existingUser,
        });
    }

    // Create new user if doesn't exist
    const newUser = await prisma.user.create({
        data: { name },
    });

    return NextResponse.json({
        status: "success",
        message: "User has signed up",
        user: newUser,
    });
}