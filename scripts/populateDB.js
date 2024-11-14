import mongoose from "mongoose";
import fs from "fs";
import Video from "../src/models/videos.js";
import User from "../src/models/users.js";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const jsonPath = path.resolve("../m2.json");
const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

mongoose
  .connect("mongodb://root:example@localhost:27017/warmup?authsource=admin", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    await Video.deleteMany({});
    await User.deleteMany({});
    // console.log(jsonData);
    for (const key in jsonData) {
      console.log(`${key}: ${jsonData[key]}`);
      const title = key.split(".")[0];
      const desc = jsonData[key];
      const newVideo = new Video({
        videoId: title,
        title: title,
        description: jsonData[key],
        manifest: `${title}_output.mpd`,
        thumbnail: `${title}_thumbnail.jpg`,
        status: "complete",
      });
      await newVideo.save();
      console.log(`Saved _id: ${newVideo._id}`);
    }
    console.log("Data inserted successfully to mongoDB!");
    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
