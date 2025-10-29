import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST method
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;
        
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                { message: "text is required" },
                { status: 400 }
            );
        }

        const created = await prisma.cameronYuxinMessage.create({ data: { text } });

        return NextResponse.json({
            message: 'Message created successfully',
            data: {
                id: created.id,
                text: created.text,
                createdAt: created.createdAt
            }
        }, { status: 201 });
    } catch (error) {
        console.error('POST error:', error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET method
export async function GET() {
    try {
        const items = await prisma.cameronYuxinMessage.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
        });

        return NextResponse.json({
            message: "Messages retrieved successfully",
            data: items
        }, { status: 200 });
    } catch (error) {
        console.error('GET error:', error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}