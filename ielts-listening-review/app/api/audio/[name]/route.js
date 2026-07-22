import { getGridFS } from "@/lib/db.mjs";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const name = params.name;
  const bucket = await getGridFS();
  
  const files = await bucket.find({ filename: name }).toArray();
  if (files.length === 0) return new Response("Không tìm thấy audio", { status: 404 });
  const file = files[0];
  const size = file.length;
  const contentType = file.metadata?.contentType || "application/octet-stream";
  
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    end = Math.min(end, size - 1);
    
    const downloadStream = bucket.openDownloadStreamByName(name, { start, end: end + 1 });
    
    return new Response(Readable.toWeb(downloadStream), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": contentType,
      },
    });
  }
  
  const downloadStream = bucket.openDownloadStreamByName(name);
  return new Response(Readable.toWeb(downloadStream), {
    headers: { "Content-Length": String(size), "Content-Type": contentType, "Accept-Ranges": "bytes" },
  });
}
