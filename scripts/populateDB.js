const mongoose = require("mongoose");
const fs = require("fs");
const Video = require("../src/models/videos");
const path = require("path");
require("dotenv").config();

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
      const newVideo = new Video({
        title: key,
        description: jsonData[key],
      });
      await newVideo.save();
    }

    console.log("Data inserted successfully!");
    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
