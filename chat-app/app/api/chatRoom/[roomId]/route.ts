import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";





export async function GET(request: NextRequest, { params}:{params:Promise<{roomId:string}>}) {
    const {roomId} = await params;
    const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
    });
    return NextResponse.json(room);
}   