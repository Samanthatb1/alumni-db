// MongoDB Atlas connection helper.
//
// The client is created once and reused across requests (the driver manages an
// internal connection pool). Configure it via environment variables:
//   MONGODB_URI        - your Atlas connection string (required)
//   MONGODB_DB         - database name (default: "hackny")
//   MONGODB_COLLECTION - collection name (default: "members")

import { MongoClient } from 'mongodb'

let client
let clientPromise

export function getMongoConfig() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Missing MONGODB_URI (set your Atlas connection string in server/.env)')
  }
  return {
    uri,
    dbName: process.env.MONGODB_DB || 'hackny',
    collectionName: process.env.MONGODB_COLLECTION || 'members',
  }
}

export async function getClient() {
  if (!clientPromise) {
    const { uri } = getMongoConfig()
    client = new MongoClient(uri)
    clientPromise = client.connect()
  }
  await clientPromise
  return client
}

export async function getMembersCollection() {
  const { dbName, collectionName } = getMongoConfig()
  const connected = await getClient()
  return connected.db(dbName).collection(collectionName)
}

export async function closeClient() {
  if (client) {
    await client.close()
    client = undefined
    clientPromise = undefined
  }
}
