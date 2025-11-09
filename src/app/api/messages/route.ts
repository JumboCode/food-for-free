// app/api/messages/route.ts

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function POST(req: Request) {

  try {
    const body = await req.json();
    const text = body.text?.trim();

    //validate text
    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    //create message in db 
    const created = await prisma.aleaAngoMessage.create({
      data: { text },
    });
    
    return NextResponse.json(
      { id: created.id, text: created.text, createdAt: created.createdAt },
      { status: 201 }
    );
    
  } catch (err) {
    //log error
    console.error("POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const items = await prisma.aleaAngoMessage.findMany({
      orderBy: {createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error("GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

