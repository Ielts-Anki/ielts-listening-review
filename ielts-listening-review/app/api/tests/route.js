import { NextResponse } from "next/server";
import { getDb, uid } from "@/lib/db.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  // In the old code, tests were unshifted (added to start). 
  // Sorting by createdAt descending gives the same order.
  const tests = await db.collection("tests").find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ tests });
}

export async function POST(req) {
  const body = await req.json();
  const from = parseInt(body.qFrom, 10) || 1;
  const to = parseInt(body.qTo, 10) || from;
  const questions = [];
  for (let n = from; n <= to; n++) questions.push({ num: n, text: "", guessType: "", key: "" });
  
  const test = {
    id: uid("t"),
    source: (body.source || "").trim() || "Khác",
    testNo: (body.testNo || "").trim(),
    part: parseInt(body.part, 10) || 1,
    title: (body.title || "").trim(),
    link: (body.link || "").trim(),
    audioUrl: "",
    transcript: "",
    questions,
    sessions: [],
    draft: null,
    createdAt: Date.now(),
  };
  
  const db = await getDb();
  await db.collection("tests").insertOne(test);
  
  return NextResponse.json({ test });
}
