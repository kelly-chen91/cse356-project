import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();
import mongoose from "mongoose";

const client = new MongoClient(process.env.MONGO_URL);

const database = client.db("warmup");

const replicas = 1; 

// Get All Videos, Users
const getAll = async (collection) => {
  const col = database.collection(collection);
  return await col.find().toArray();
}

/**
 * 
 * @param {String} collection 
 * @param {JS Object} filter 
 * @returns document
 */
const getOne = async (collection, filter) => {
  const col = database.collection(collection);
  return await col.findOne(filter);
}

// Insert User, Video
const insertOne = async (collection, data) => {
  const col = database.collection(collection);
  return await col.insertOne(data, {writeConcern: {w:replicas, wtimeout: 10000}});
}

// Increment 
// Update
const updateOne = async (collection, filter, data) => {
  const col = database.collection(collection);
  return await col.updateOne(filter, data, {writeConcern: {w:0, wtimeout: 10000}})
}


const createIndex = async (collection, indexField, options = {}) => {
  const col = database.collection(collection);
  return await col.createIndex(indexField, options);
};

const connectDB = async () => {
  // try {
  //   await mongoose.connect(process.env.MONGO_URL, {
  //     useNewUrlParser: true,
  //     useUnifiedTopology: true,
  //     // poolSize: 25,
  //     // maxPoolSize: 50,
  //   });
  //   console.log("MongoDB connected");
  // } catch (error) {
  //   console.error("MongoDB connection failed:", error);
  //   process.exit(1);
  // }
  try {
    await client.connect(); 

    await createIndex("videos", {videoId: 1}, {unique: true});
    console.log("Index created on videoID in videos collection");
  } catch (error) { 
    console.error("Failed to initialize database.");
  }
  
};

export { connectDB, getAll, getOne, insertOne, updateOne };
