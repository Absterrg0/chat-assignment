import prisma from "@/lib/db";
import { NextResponse } from "next/server";




export async function GET() {
    const rooms = await prisma.chatRoom.findMany();
    return NextResponse.json(rooms);
}