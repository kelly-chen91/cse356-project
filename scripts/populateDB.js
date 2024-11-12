import mongoose from "mongoose";
import fs from "fs";
import Video from "../src/models/videos.js";
import path from "path";
import dotenv from "dotenv";

import GorsePkg from "gorsejs"
const { Gorse, Item } = GorsePkg;

const gorse = new Gorse({ endpoint: "http://127.0.0.1:8088", secret: "zhenghaoz" });

dotenv.config();

const jsonPath = path.resolve("../m2.json");
const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

const items = [];

mongoose
  .connect("mongodb://root:example@localhost:27017/warmup?authsource=admin", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    await Video.deleteMany({});

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

      // Populate gorse items.
      console.log(`Marking item ${newVideo._id} into gorse...`)
      items.push({
        ItemId: newVideo._id,
        IsHidden: false
      });
    }

    console.log("Data inserted successfully!");
    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Inserting items to gorse.
console.log("Inserting items into gorse...");
gorse.upsertItems(items);
