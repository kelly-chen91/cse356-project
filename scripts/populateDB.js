import mongoose from "mongoose";
import fs from "fs";
import Video from "../src/models/videos.js";
import path from "path";
import dotenv from "dotenv";


const gorse = new Gorse({
  endpoint: "http://127.0.0.1:8088",
  secret: "zhenghaoz",
  debug: true,
});

console.log("GORSE: ", gorse);
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
        status: "complete",
      });
      await newVideo.save();

      // Populate gorse items.
      console.log(`Marking item ${newVideo._id} into gorse...`);
      items.push({
        ItemId: newVideo._id,
        IsHidden: false,
      });
    }

    console.log("Data inserted successfully to mongoDB!");
    mongoose.disconnect();
    // Inserting items to gorse.
    console.log("Inserting items into gorse...");

    gorse
      .upsertItems(items)
      .then(async (res) => {
        console.log(`Successfully inserted item to Gorse! ${res}`);
        await gorse.insertUser({ userId: "bob" });
        await client.insertFeedbacks([
          { FeedbackType: "like", UserId: "bob", ItemId: items[0].ItemId },
        ]);

        gorse
          .getRecommend({
            userId: "bob",
            cursorOptions: { n: 10 },
          })
          .then((rec) => {
            console.log("RECOMMENDATIONS: ", rec);
          })
          .catch((err) => {
            console.log(`This is doomed: ${err}`);
          });
      })
      .catch((err) => {
        console.log(`Failed to insert to Gorse :( ${err}`);
      });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
