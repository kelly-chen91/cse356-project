import express from "express";
import multer from "multer";
import redis from "redis"; 
import Video from "../models/videos.js";
import User from "../models/users.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { getRecommendation } from "../utils/recommender.js";

// Setup Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "videos/"); // Specify the destination folder
  },
  filename: function (req, file, cb) {
    // Use the original filename and add a unique identifier to avoid overwrites
    console.log("filename ===", file.originalname);
    cb(null, `${file.originalname}`);
  },
});
const upload = multer({ storage: storage });
const taskQueue = redis.createClient({
  url: process.env.REDIS_URL
})

await taskQueue.connect();
taskQueue.on("error", (err) => console.error("Redis Client Error:", err));


const router = express.Router();

router
  .get("/media/:path", async (req, res) => {
    console.log("Reached media/:path");
    // console.log("path: ", req.params.path);

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    const filePath = req.params.path;
    const mediaPath = path.resolve("/app/media");
    res.sendFile(`${mediaPath}/${filePath}`);
  })
  .post("/api/videos", async (req, res) => {
    console.log("reached /api/videos");
    const { videoId, count } = req.body;
    const userId = req.session.userId;

    console.log("COUNT=", count);

    const mode = videoId ? "item-based" : "user-based";

    console.log(`Getting mode: ${mode}, video ID: ${videoId}`);

    const videoList = await getRecommendation(mode, userId, videoId, count);

    console.log("SENDING VIDEO LIST =====");
    console.log(videoList);
    return res.json({ status: "OK", videos: videoList });
  })
  .get("/api/thumbnail/:id", (req, res) => {
    // console.log("Reached api/thumbnail/:id");

    const id = req.params.id;

    // console.log("Thumbnail ID ===== ", id);
    // To be determined, we can change the path to resolve it.
    const thumbnailPath = path.resolve(`/app/media/${id}_thumbnail.jpg`);

    if (!fs.existsSync(thumbnailPath)) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "Thumbnail not found" });
    }

    console.log("Sending thumbnail from path:", thumbnailPath);
    res.sendFile(thumbnailPath);
  })
  .get("/api/manifest/:id", (req, res) => {
    // console.log("Reached api/manifest/:id");

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    let id = req.params.id;

    if (id.split(".").length == 1) {
      id += "_output.mpd";
    }
    // console.log(`id: ${id}`);

    const mediaPath = path.resolve("/app/media");
    // console.log(`path: ${mediaPath}/${id}`);
    res.sendFile(`${mediaPath}/${id}`);
  })
  .post("/api/like", async (req, res) => {
    console.log("Reached /api/like ....");
    // Check if user is currently logged in
    const uid = req.session.userId;
    if (!uid) {
      console.log("User not logged in");
      return res.status(200).json({
        status: "ERROR",
        error: true,
        message: "User is not logged in.",
      });
    }

    // Update video information.
    const { id, value } = req.body;

    try {
      const user = await User.findById(uid);
      const video = await Video.findOne({ videoId: id });
      console.log("Video likes Previous:", video.likes);

      const liked = user.liked.includes(id);
      const disliked = user.disliked.includes(id);

      if ((value && liked) || (!value && disliked)) {
        console.log("The value that you want to set is the same");
        return res.status(200).json({
          status: "ERROR",
          error: true,
          message: "The value that you want to set is the same",
        });
      }

      if (value) {
        if (disliked) {
          user.disliked.pull(id);
          video.dislikedBy.pull(user._id);
        }
        user.liked.push(id);
        video.likes += 1;
      } else {
        if (liked) {
          user.liked.pull(id);
          video.likes -= 1;
        }
        user.disliked.push(id);
        // video.dislike
      }

      console.log("Video likes after:", video.likes);

      await user.save();
      await video.save();

      res.status(200).json({ status: "OK", likes: video.likes });
    } catch (error) {
      console.log(error);
      res.status(200).json({
        status: "ERROR",
        error: true,
        message: "An error occurred while updating like status",
      });
    }
  })
  .post("/api/upload", upload.single("mp4File"), async (req, res) => {
    console.log("Reached api/upload");

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    const { author, title, description } = req.body;
    const mp4File = req.file;
    console.log("body:", req.body);
    // console.log("mp4File:", mp4File.filename);

    // SKIBIDI WAS HERE :3

    if (!author || !title || !description || !mp4File) {
      console.log("ERR");
      return res.status(400).json({
        status: "ERROR",
        error: true,
        message: "Missing required fields",
      });
    }

    const videoName = mp4File.originalname;

    const newVideo = new Video({
      author: author,
      title: title,
      description: description,
      status: "processing",
      manifest: `${videoName}_output.mpd`,
      thumbnail: `${videoName}_thumbnail.jpg`,
    });

    await newVideo.save();
    const videoId = newVideo.videoId;
    await User.findByIdAndUpdate(
      req.session.userId,
      { $push: { videos: videoId } },
      { new: true }
    );

    res.status(200).json({ status: "OK", id: videoId });

    //Insert Redis queue here
    const task = JSON.stringify({ videoName: videoName, videoId: videoId });
    console.log("what is task ==== ", task)
    taskQueue.publish("ffmpeg_tasks", task, (err) => {
      if (err) {
        console.error("Error adding task to queue:", err);
        return res.status(500).json({ error: "Failed to queue task" });
      }
      console.log(`Task queued: ${task}`);
      return res.status(200).json({ message: "Task queued successfully", task });
    });

    // FFmpeg command to pad the video to 1280x720 with black bars
    const padCommand = `ffmpeg -i "videos/${videoName}" -vf "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2" -c:a copy "padded_videos/${videoId}.mp4" -y &> /dev/null`;

    const thumbnailCommand = `ffmpeg -i "padded_videos/${videoId}.mp4" -vf 'scale=w=iw*min(320/iw\\,180/ih):h=ih*min(320/iw\\,180/ih),pad=320:180:(320-iw*min(320/iw\\,180/ih))/2:(180-ih*min(320/iw\\,180/ih))/2' -frames:v 1 "media/${videoId}_thumbnail.jpg" -y &> /dev/null`;

    const manifestCommand = `
        ffmpeg -hide_banner -loglevel error -i "padded_videos/${videoId}.mp4" \
            -map 0:v -b:v:0 512k -s:v:0 640x360 \
            -map 0:v -b:v:1 768k -s:v:1 960x540 \
            -map 0:v -b:v:2 1024k -s:v:2 1280x720 \
            -f dash -seg_duration 10 -use_template 1 -use_timeline 1 \
            -init_seg_name "${videoId}_chunk_init_\\$RepresentationID\\$.m4s" \
            -media_seg_name "${videoId}_chunk_\\$RepresentationID\\$_\\$Number\\$.m4s" \
            -adaptation_sets "id=0,streams=v" \
            "media/${videoId}_output.mpd"
        `;

    // Helper function to execute commands and return a Promise
    const execPromise = (command) => {
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          // console.log(error);
          // console.log(stderr);
          // console.log(stdout);
          if (error) {
            reject(`Error: ${error.message}`);
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
          }
          resolve(stdout); // Resolve when the command completes successfully
        });
      });
    };

    // Execute the padding command first
    console.log(`Executing padding command... video name=${videoName}`);
    // await execPromise(padCommand);

    // After padding completes, create the thumbnail
    console.log("Creating thumbnail now...");
    // await execPromise(thumbnailCommand);

    // After thumbnail creation, execute the manifest command
    console.log("Creating chunk and mpd...");
    // await execPromise(manifestCommand);

    // Updates Status after recieved notifications
    // newVideo.status = "complete";
    // await newVideo.save();

    console.log("All commands executed successfully!");
  })
  .get("/api/processing-status", async (req, res) => {
    console.log("Reached api/processing-status");

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    const user = await User.findById(req.session.userId).exec();
    console.log("USER =", user);
    if (user) {
      const videoStatusPromises = user.videos.map(async (vId) => {
        const video = await Video.findOne({ videoId: vId }).exec();
        // console.log(video);
        return { id: vId, title: video.title, status: video.status };
      });
      const videoStatus = await Promise.all(videoStatusPromises);
      console.log("Video statuses:", videoStatus);
      return res.status(200).json({ status: "OK", videos: videoStatus });
    }
  })
  .post("/api/view", async (req, res) => {
    console.log("Reached /api/view...");
    const uid = req.session.userId;
    if (!uid)
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });

    // console.log(`THIS IS REQ BODY FOR VIEW: ${req.body}`);
    // console.log(`THIS IS REQ BODY FOR VIEW: ${JSON.stringify(req.body)}`);
    const { id } = req.body;
    console.log("id ===", id);
    // Check if user has seen video before

    const user = await User.findById(uid);

    const targetVid = await Video.findOne({ videoId: id }).exec();

    // console.log("Video found from id: ", targetVid);
    // console.log(`User watched ${user.watched}`);
    const foundVideo = user.watched.includes(targetVid.videoId);
    let previouslyWatched = false;
    if (foundVideo) {
      // console.log(`User ${user.username} already viewed ${id}`);
      previouslyWatched = true;
    } else {
      // console.log(`User ${user.username} has not viewed ${id}`);
      user.watched.push(id);
      await user.save();
    }
    return res.status(200).json({ status: "OK", viewed: previouslyWatched });
  });
export default router;
