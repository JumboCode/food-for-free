// app/api/messages/route.ts

import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const created = await prisma.yuvitSaraMessage.create({
      data: { text },
    });

    return NextResponse.json(
      { id: created.id, text: created.text, createdAt: created.createdAt },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
<<<<<<< HEAD
    const items = await prisma.yuvitSaraMessage.findMany({
      orderBy: { createdAt: "desc" },
=======
    const items = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
>>>>>>> main
      take: 5,
    });

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
