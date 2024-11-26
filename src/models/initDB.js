import { MongoClient } from "mongodb";

// MongoDB URI and database name
const uri = process.env.MONGO_URL;

async function createUserCollection() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Define the user collection schema
    const userCollection = db.collection("users");

    // Set up validation rules (schema) for the "users" collection
    await db.command({
      collMod: "users",
    });

    // Create compound and text indexes
    await userCollection.createIndex({ username: 1, verified: 1 });
    await userCollection.createIndex({ username: "text", email: "text" });

    console.log("Collection and indexes set up successfully");
  } catch (error) {
    console.error("Error setting up the collection:", error);
  } finally {
    await client.close();
  }
}

// Call the function to initialize the schema and indexes
createUserCollection();
