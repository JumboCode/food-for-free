// app/api/messages/route.ts

import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text } = body;

        // Validate text (trim; must be non-empty)
        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'text is required' }, { status: 400 });
        }

        // Insert via Prisma
        const created = await prisma.tessJustinMessage.create({
            data: { text: text.trim() },
        });

        // Return { id, text, createdAt } with status 201
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        console.error('Error creating message:', err);
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
}

export async function GET() {
    try {
        // Fetch past 5 messages
        const items = await prisma.tessJustinMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        return NextResponse.json(items, { status: 200 });
    } catch (err) {
        console.error('Error fetching messages:', err);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
