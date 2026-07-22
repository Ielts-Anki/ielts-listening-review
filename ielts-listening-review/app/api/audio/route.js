import { NextResponse } from "next/server";
import { getGridFS } from "@/lib/db.mjs";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
    
  const buf = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const name = `${Date.now()}_${safe}`;
  
  const bucket = await getGridFS();
  const uploadStream = bucket.openUploadStream(name, {
    metadata: { contentType: file.type || "application/octet-stream" }
  });
  
  uploadStream.end(buf);
  
  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      resolve(NextResponse.json({ url: `/api/audio/${name}` }));
    });
    uploadStream.on("error", (error) => {
      resolve(NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 }));
    });
  });
}
