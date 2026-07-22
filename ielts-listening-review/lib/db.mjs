import { MongoClient, GridFSBucket } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("Vui lòng cấu hình MONGODB_URI trong biến môi trường.");
}

const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri || "mongodb://localhost:27017/ielts_listening_review", options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb() {
  const c = await clientPromise;
  return c.db();
}

export async function getGridFS() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "audio" });
}

export function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
