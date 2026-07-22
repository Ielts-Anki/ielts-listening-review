import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/db.mjs";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const { GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !MAIL_TO) {
    return NextResponse.json({ error: "Thiếu biến môi trường cấu hình mail." }, { status: 500 });
  }

  const db = await getDb();
  const now = Date.now();
  const due = await db.collection("cards")
    .find({ due: { $lte: now } })
    .toArray();
    
  if (due.length === 0) {
    return NextResponse.json({ message: "Không có thẻ đến hạn — không gửi mail." });
  }

  const sample = due.slice(0, 8).map((c) => `• ${c.front}${c.back ? " — " + c.back : ""}`).join("\n");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s+/g, "") },
  });

  await transporter.sendMail({
    from: `"IELTS Listening" <${GMAIL_USER}>`,
    to: MAIL_TO,
    subject: `🎧 Hôm nay có ${due.length} thẻ Listening cần ôn`,
    text: `Bạn có ${due.length} thẻ đến hạn.\n\nVí dụ:\n${sample}\n\nMở app → tab Ôn thẻ để học.`,
  });
  
  return NextResponse.json({ message: `Đã gửi mail nhắc ${due.length} thẻ tới ${MAIL_TO}.` });
}
