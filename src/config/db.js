import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDB() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in environment variables");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("pawsnest");
  console.log("MongoDB connected successfully");
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database is not connected yet. Call connectDB() first.");
  return db;
}

export function getCollections() {
  const database = getDB();
  return {
    usersCollection: database.collection("users"),
    petsCollection: database.collection("pets"),
    requestsCollection: database.collection("adoptionRequests"),
  };
}
