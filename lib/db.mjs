import { MongoClient, GridFSBucket } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("Vui lòng cấu hình MONGODB_URI trong biến môi trường.");
}

const options = {};

let client;
let clientPromise;

function getClientPromise() {
  if (clientPromise) return clientPromise;
  
  const fallbackUri = uri || "mongodb://localhost:27017/ielts_listening_review";
  
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(fallbackUri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(fallbackUri, options);
    clientPromise = client.connect();
  }
  
  return clientPromise;
}

export async function getDb() {
  const c = await getClientPromise();
  return c.db();
}

export async function getGridFS() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "audio" });
}

export function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
