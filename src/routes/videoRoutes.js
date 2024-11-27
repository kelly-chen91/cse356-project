import express from "express";
import multer from "multer";
import redis from "redis";
import fs from "fs";
import path from "path";
import { getRecommendation } from "../utils/recommender.js";
import { getOne, insertOne, updateOne } from "../config/dbConfig.js"
import { ObjectId } from "mongodb";

import winston from "winston";
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: 'app.log' }), // Log to file
    ],
});

// 50 x 800 matrix
// users x videos

// Setup Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "videos/"); // Specify the destination folder
    },
    filename: function (req, file, cb) {
        // Use the original filename and add a unique identifier to avoid overwrites
        // logger.info("filename ===", file.originalname);
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
    .post("/api/videos", async (req, res) => {
        logger.info("reached /api/videos");
        const { videoId, count } = req.body;
        const userId = req.session.userId;

        // logger.info("COUNT=", count);

        const mode = videoId ? "item-based" : "user-based";

        // logger.info(`Getting mode: ${mode}, video ID: ${videoId}`);

        const videoList = await getRecommendation(mode, userId, videoId, count);

        // logger.info("SENDING VIDEO LIST =====");
        // logger.info(videoList);
        return res.json({ status: "OK", videos: videoList });
    })
    // .get("/api/thumbnail/:id", (req, res) => {
    //     // logger.info("Reached api/thumbnail/:id");

    //     const id = req.params.id;

    //     // logger.info("Thumbnail ID ===== ", id);
    //     // To be determined, we can change the path to resolve it.
    //     const thumbnailPath = path.resolve(`/app/media/${id}_thumbnail.jpg`);

    //     if (!fs.existsSync(thumbnailPath)) {
    //         return res
    //             .status(200)
    //             .json({ status: "ERROR", error: true, message: "Thumbnail not found" });
    //     }

    //     // logger.info("Sending thumbnail from path:", thumbnailPath);
    //     res.sendFile(thumbnailPath);
    // })
    // .get("/api/manifest/:id", (req, res) => {
    //     // logger.info("Reached api/manifest/:id");

    //     if (!req.session.userId) {
    //         return res
    //             .status(200)
    //             .json({ status: "ERROR", error: true, message: "User not logged in" });
    //     }

    //     let id = req.params.id;

    //     if (id.split(".").length == 1) {
    //         id += "_output.mpd";
    //     }
    //     // logger.info(`id: ${id}`);

    //     const mediaPath = path.resolve("/app/media");
    //     // logger.info(`path: ${mediaPath}/${id}`);
    //     res.sendFile(`${mediaPath}/${id}`);
    // })
    .post("/api/like", async (req, res) => {
        logger.info("Reached /api/like ....");
        // Check if user is currently logged in
        const uid = req.session.userId;
        if (!uid) {
            logger.info("User not logged in");
            return res.status(200).json({
                status: "ERROR",
                error: true,
                message: "User is not logged in.",
            });
        }

        // Update video information.
        const { id, value } = req.body;

        try {
            const user = await getOne("users", { _id: new ObjectId(uid) })
            // const videoId = new ObjectId(id);
            const video = await getOne("videos", { videoId: id })

            logger.info(`what is video ${video} with id ${id}`);
            const liked = user.liked.includes(id);
            const disliked = user.disliked.includes(id);

            if ((value && liked) || (!value && disliked)) {
                logger.info("The value that you want to set is the same");
                return res.status(200).json({
                    status: "ERROR",
                    error: true,
                    message: "The value that you want to set is the same",
                });
            }

            if (value) {
                if (disliked) {
                    // user.disliked.pull(id);
                    await updateOne("users", { _id: user._id }, { $pull: { disliked: id } })
                    //   await User.findByIdAndUpdate(uid, {$pull: {disliked: id}});
                    // video.dislikedBy.pull(user._id);
                    await updateOne("videos", { "videoId": id }, { $pull: { dislikedBy: uid } })
                    //   video = await Video.findOneAndUpdate({videoId: id}, {$pull: {dislikedBy: uid}});
                }
                // user.liked.push(id);
                await updateOne("users", { _id: user._id }, { $push: { liked: id } })
                // await User.findByIdAndUpdate(uid, {$push: {liked: id}});

                await updateOne("videos", { "videoId": id }, { $inc: { likes: 1 } })

                // video = await Video.findOneAndUpdate({videoId: id}, {$inc: {likes: 1}});
            } else {
                if (liked) {
                    // user.liked.pull(id);
                    await updateOne("users", { _id: user._id }, { $pull: { liked: id } })
                    //   await User.findByIdAndUpdate(uid, {$pull: {liked: id}})
                    // video.likes -= 1;
                    await updateOne("videos", { "videoId": id }, { $inc: { likes: -1 } })
                    //   video = await Video.findOneAndUpdate({videoId: id}, {$inc: {likes: -1}})
                }
                // user.disliked.push(id);
                await updateOne("users", { _id: user._id }, { $push: { disliked: id } })
                // await User.findByIdAndUpdate(uid, {$push: {disliked: id}})
                // video.dislike
            }

            // logger.info("Video likes after:", video.likes);


            res.status(200).json({ status: "OK", likes: video.likes });
        } catch (error) {
            // logger.error(error);
            res.status(200).json({
                status: "ERROR",
                error: true,
                message: "An error occurred while updating like status",
            });
        }
    })
    .post("/api/upload", upload.single("mp4File"), async (req, res) => {
        logger.info("Reached api/upload");

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        const { author, title, description } = req.body;
        const mp4File = req.file;

        if (!author || !title || !description || !mp4File) {
            logger.info("ERR");
            return res.status(400).json({
                status: "ERROR",
                error: true,
                message: "Missing required fields",
            });
        }

        const videoName = mp4File.originalname;

        const videoId = new ObjectId();
        const newVideo = {
            _id: videoId,
            videoId: videoId.toString(),
            author: author,
            title: title,
            description: description,
            status: "processing",
            manifest: `${videoName}_output.mpd`,
            thumbnail: `${videoName}_thumbnail.jpg`,
            likedBy: [],
            dislikedBy: [],
            likes: 0
        }
        await insertOne("videos", newVideo)
        // const videoId = video._id;

        // await newVideo.save();
        // await User.findByIdAndUpdate(
        //   req.session.userId,
        //   { $push: { videos: videoId } },
        //   { new: true }
        // );
        await updateOne("users", { _id: new ObjectId(req.session.userId) }, { $push: { videos: videoId.toString() } })

        res.status(200).json({ status: "OK", id: videoId });

        // //Insert Redis queue here
        const task = JSON.stringify({ videoName: videoName, videoId: videoId.toString() });
        // logger.info("what is task ==== ", task)
        taskQueue.publish("ffmpeg_tasks", task, (err) => {
            if (err) {
                console.error("Error adding task to queue:", err);
                return res.status(500).json({ error: "Failed to queue task" });
            }
            // logger.info(`Task queued: ${task}`);
            return res.status(200).json({ message: "Task queued successfully", task });
        });
    })
    .get("/api/processing-status", async (req, res) => {
        logger.info("Reached api/processing-status");

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        // const user = await User.findById(req.session.userId).exec();
        const user = await getOne("users", { _id: new ObjectId(req.session.userId) })

        // logger.info("USER =", user);
        if (user) {
            const videoStatusPromises = user.videos.map(async (vId) => {
                // const video = await Video.findOne({ videoId: vId }).exec();
                const video = await getOne("videos", { "videoId": vId })

                // logger.info(video);
                return { id: vId, title: video.title, status: video.status };
            });
            const videoStatus = await Promise.all(videoStatusPromises);
            // logger.info("Video statuses:", videoStatus);
            return res.status(200).json({ status: "OK", videos: videoStatus });
        }
    })
    .post("/api/view", async (req, res) => {
        logger.info("Reached /api/view...");
        const uid = req.session.userId;
        if (!uid)
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });

        // logger.info(`THIS IS REQ BODY FOR VIEW: ${req.body}`);
        // logger.info(`THIS IS REQ BODY FOR VIEW: ${JSON.stringify(req.body)}`);
        const { id } = req.body;
        logger.info(`id === ${id}`);
        // Check if user has seen video before

        const user = await getOne("users", { _id: new ObjectId(uid) });
          
        const targetVid = await getOne("videos", { "videoId": id })

        logger.info(`Video found from id: , ${targetVid}`);
        // logger.info(`User watched ${user.watched}`);
        const foundVideo = user.watched.includes(targetVid.videoId);
        let previouslyWatched = false;
        if (foundVideo) {
            // logger.info(`User ${user.username} already viewed ${id}`);
            previouslyWatched = true;
        } else {
            // logger.info(`User ${user.username} has not viewed ${id}`);
            await updateOne("users", { _id: user._id }, { $push: { watched: id } })
        }
        return res.status(200).json({ status: "OK", viewed: previouslyWatched });
    });
export default router;
