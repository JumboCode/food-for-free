// app/api/messages/route.ts

import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const created = await prisma.sophieJuliaMessage.create({ data: { text } });
    return NextResponse.json(created, { status: 201 });
}

export async function GET() {
    const items = await prisma.sophieJuliaMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    return NextResponse.json(items);
}
