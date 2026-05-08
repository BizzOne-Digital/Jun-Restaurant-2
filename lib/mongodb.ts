import mongoose from "mongoose";
import { getMongoUri } from "./server-env";

const MONGODB_URI = getMongoUri();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "Please define MONGODB_URI in .env (or .env.local). For local dev, try mongodb://127.0.0.1:27017/awok"
    );
  }
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
