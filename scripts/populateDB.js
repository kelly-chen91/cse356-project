import { mongoose } from "mongoose";
import { fs } from "fs";
import { Video } from "../src/models/videos.js";
import { path } from "path";
import { dotenv } from "dotenv";
// const mongoose = require("mongoose");
// const fs = require("fs");
// const Video = require("../src/models/videos");
// const path = require("path");
dotenv.config();

mongoose
  .connect(process.env.POPULATE_MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    await Video.deleteMany({});
    const jsonPath = path.resolve(process.env.VIDEO_ID_MAP);

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // console.log(jsonData);
    for (const key in jsonData) {
      console.log(`${key}: ${jsonData[key]}`);
      const title = key.split(".")[0];
      const desc = jsonData[key];
      const newVideo = new Video({
        videoId: title,
        title: title,
        description: jsonData[key],
        manifest: `${title}/${title}_output.mpd`,
      });
      await newVideo.save();
    }

    const newVideo = new Video({
      author: "Bob the Builder",
      title: "Test Video",
      description: "Test Video",
    });

    await newVideo.save();

    console.log("Data inserted successfully!");
    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
