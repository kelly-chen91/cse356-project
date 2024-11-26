import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
dotenv.config();
import mongoose from "mongoose";
import { loggers } from "winston";

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
  // console.log(`What is col:  ${col}, filter: ${JSON.stringify(filter)}`)

  // const video = await database.collection("videos").findOne({
  //   videoId: new ObjectId("67456a89cc59efef579121d8"),
  // });
  // console.log("Direct query with hardcoded ObjectId result:", video);
  const res = await col.findOne(filter);
  console.log(`Query result: ${JSON.stringify(res)} with filter: ${JSON.stringify(filter)}`);

  return res;
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
  return await col.updateOne(filter, data, {writeConcern: {w:replicas, wtimeout: 10000}})
}


// const createIndex = async (collection, indexField, options = {}) => {
//   const col = database.collection(collection);
//   return await col.createIndex(indexField, options);
// };

const ensureIndex = async (collectionName, indexSpec, options = {}) => {
  const col = database.collection(collectionName);

  await col.dropIndexes(); // Drop the index
  await col.createIndex(indexSpec, options); // Recreate it

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
    // await client.connect(); 

    await ensureIndex("videos", {videoId: 1}, {unique: true});
    console.log("Index created on videoID in videos collection");
  } catch (error) { 
    console.error("Failed to initialize database. Error:", error);
  }
  
};

export { connectDB, getAll, getOne, insertOne, updateOne };
