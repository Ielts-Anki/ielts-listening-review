import { NextResponse } from "next/server";
import { getDb, uid } from "@/lib/db.mjs";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const db = await getDb();
  const test = await db.collection("tests").findOne({ id: params.id });
  if (!test) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  return NextResponse.json({ test });
}

// PATCH: cập nhật một phần (questions, transcript, audioUrl, draft, meta...).
// Nếu body.addSession có mặt -> thêm 1 phiên hoàn chỉnh vào sessions.
export async function PATCH(req, { params }) {
  const body = await req.json();
  const db = await getDb();
  
  const test = await db.collection("tests").findOne({ id: params.id });
  if (!test) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  const allowed = ["source", "testNo", "part", "title", "link", "audioUrl", "transcript", "questions", "draft"];
  for (const k of allowed) if (k in body) test[k] = body[k];

  if (body.addSession) {
    const s = { id: uid("s"), date: Date.now(), ...body.addSession };
    if (!test.sessions) test.sessions = [];
    test.sessions.push(s);
  }
  
  if (body.updateLastSession && test.sessions && test.sessions.length > 0) {
    Object.assign(test.sessions[test.sessions.length - 1], body.updateLastSession);
  }
  
  const updateFields = { ...test };
  delete updateFields._id;
  
  await db.collection("tests").updateOne(
    { id: params.id },
    { $set: updateFields }
  );
  
  return NextResponse.json({ test: updateFields });
}

export async function DELETE(_req, { params }) {
  const db = await getDb();
  await db.collection("tests").deleteOne({ id: params.id });
  return NextResponse.json({ ok: true });
}
