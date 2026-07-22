import { NextResponse } from "next/server";
import { getDb } from "@/lib/db.mjs";
import { applyGrade } from "@/lib/srs.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const now = Date.now();
  
  const total = await db.collection("cards").countDocuments();
  const due = await db.collection("cards")
    .find({ due: { $lte: now } })
    .sort({ due: 1 })
    .toArray();
    
  return NextResponse.json({ due, total });
}

// POST { id, grade: again|hard|good|easy }
export async function POST(req) {
  const { id, grade } = await req.json();
  const db = await getDb();
  
  const card = await db.collection("cards").findOne({ id });
  if (!card) return NextResponse.json({ error: "Không tìm thấy thẻ" }, { status: 404 });
  
  // Create a copy without _id for replacement, or just let updateOne update the fields.
  // applyGrade modifies the passed object directly.
  applyGrade(card, grade);
  
  // We should not update _id, so we can delete it before $set, or just $set specific fields.
  const updateFields = { ...card };
  delete updateFields._id;
  
  await db.collection("cards").updateOne(
    { id },
    { $set: updateFields }
  );
  
  return NextResponse.json({ card: updateFields });
}
