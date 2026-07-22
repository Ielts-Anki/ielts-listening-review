import { NextResponse } from "next/server";
import { getDb } from "@/lib/db.mjs";
import { newCard, parseVocab } from "@/lib/srs.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const cards = await db.collection("cards").find().toArray();
  return NextResponse.json({ cards });
}

// POST { raw: "từ : nghĩa\n...", testId } hoặc { cards: [{front, back}] }
export async function POST(req) {
  const body = await req.json();
  const items = body.raw ? parseVocab(body.raw) : body.cards || [];
  if (items.length === 0) return NextResponse.json({ added: 0 });
  
  const added = items.map((it) => newCard(it.front, it.back, body.testId));
  
  const db = await getDb();
  await db.collection("cards").insertMany(added);
  
  return NextResponse.json({ added: added.length });
}
