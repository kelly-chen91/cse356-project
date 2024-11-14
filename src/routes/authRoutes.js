// Overriding require so that we can have import and require together.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
// const uuid = require("uuid");

import User from "../models/users.js";
import Video from "../models/videos.js";
import mongoose from "mongoose";
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const { exec } = require("child_process");
import cosineSimilarity from "compute-cosine-similarity";
// const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// const ffmpeg = require('fluent-ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegPath);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "videos/"); // Specify the destination folder
    },
    filename: function (req, file, cb) {
        // Use the original filename and add a unique identifier to avoid overwrites
        cb(null, `${file.originalname}`);
    },
});
const upload = multer({ storage: storage });
// const upload = multer({ dest: 'videos/' });

const router = express.Router();

// define routes for user
// 1. Sign in
//   Checks if the email exists in database
//   If email exists, compare with the hashed password in the database
//   If email does not exist or the password does not match to the database, throw error
// 2. Sign out
//   Destroy the session
//   Return to welcome page
// 3. Sign up
//   Checks if the email exists in database
//   If email exists, return an error saying the email already exists
//   If email does not exist, proceed to hash the password and add to the database
const transporter = nodemailer.createTransport({
    host: "doitand711gang.cse356.compas.cs.stonybrook.edu",
    port: 587,
    secure: false,
    tls: {
        rejectUnauthorized: false,
    },
    // ignoreTLS: true,
});

router
    .post("/api/adduser", async (req, res) => {
        console.log("/adduser");
        let { username, password, email } = req.body;
        console.log(`BEFORE EMAIL===== ${email}`);

        // email = encodeURI(email).replace(/%20/g, "+");
        console.log(`EMAIL===== ${email}, PASSWORD ==== ${password}`);
        const ccEmail =
            "kelly.chen.6@stonybrook.edu, zhenting.ling@stonybrook.edu, mehadi.chowdhury@stonybrook.edu";

        // Check for duplicate user
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            console.log(`${username} ALREADY EXISTS`);
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User already exists" });
        }

        // Create the new user.
        const verificationKey = "supersecretkey";
        const pwhash = await bcrypt.hash(password, 10);
        const newUser = new User({
            username: username,
            email: email,
            pwhash: pwhash,
            verificationKey: verificationKey,
            verified: false,
        });
        await newUser.save();
        console.log(`${username} CREATED with id ${newUser._id}`);

        // Send out verification email.
        const mailOptions = {
            from: "'Test'<root@doitand711gang.cse356.compas.cs.stonybrook.edu>",
            to: email,
            cc: ccEmail,
            subject: "Please verify your account",
            text: `http://${req.headers.host}/api/verify?email=${email}&key=${verificationKey}`,
            // text: `https://www.google.com`,
        };

        await transporter.sendMail(mailOptions, (error, info) => {
            console.log("USER=====", newUser);
            if (error) {
                console.log("VERIFICATION ERROR=====", error);

                return res.status(200).json({
                    status: "ERROR",
                    error: true,
                    message: "Failed to send email",
                });
            }
        });

        if (!res.headersSent)
            return res
                .status(200)
                .json({ status: "OK", message: `${username} successfully added.` });
    })
    .post("/api/login", async (req, res) => {
        console.log("/api/login");
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        console.log(user);
        console.log(req.cookies);
        if (!user || !(await bcrypt.compare(password, user.pwhash))) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "Invalid credentials" });
        }

        if (!user.verified) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not verified" });
        }

        console.log(req.session);

        req.session.userId = user._id;
        res.status(200).json({ status: "OK", message: "Login successful" });
    })
    .post("/api/logout", (req, res) => {
        console.log("Logging out...");
        req.session.destroy((err) => {
            if (err) {
                return res.status(200).json({
                    status: "ERROR",
                    error: true,
                    errorMessage: "Logout failed",
                });
            }
            return res.json({ status: "OK" });
        });
    })
    .get("/api/verify", async (req, res) => {
        let { email, key } = req.query;
        console.log("/verify");
        console.table(req.query);
        email = encodeURI(email).replace(/%20/g, "+");
        const data = await User.findOne({ email });

        if (!data)
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not found" });
        console.log("user found");
        // If user's verification key is correct, we log the user in and redirect them to home page
        // If it is not correct, we redirect to login page
        // if (key !== data.verificationKey) {
        //     res.sendFile(
        //         __dirname +
        //         "/root/cse356-project/milestone1/src/public/components/LoginPage.html"
        //     );
        // } else {
        const user = await User.updateOne({ _id: data._id }, { verified: true });
        console.log(user);
        //     // Generate Session here
        //     req.session.userId = user._id;

        //     res.redirect("/");
        // }
        return res
            .status(200)
            .json({ status: "OK", message: "User verified successfully" });
    })
    .post("/api/check-auth", (req, res) => {
        if (!req.session.userId) {
            return res.status(200).json({
                status: "ERROR",
                error: true,
                isLoggedIn: false,
                userId: "",
            });
        }
        return res
            .status(200)
            .json({ status: "OK", isLoggedIn: true, userId: req.session.userId });
    })
    .get("/media/:path", async (req, res) => {
        console.log("Reached media/:path");
        console.log("path: ", req.params.path);

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
        const { count } = req.body;
        const userId = req.session.userId;

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        console.log(`Sending ${count} videos to ${userId}...`);


        // Find the user.
        const user = await User.findById(userId).exec();
        // if (!user) {
        //   console.log(`User does not exist.`);
        //   return res.json({ status: 404 });
        // }
        // console.log("/api/video/ USER", user);

        const videoIds = await Video.find({}, "_id"); // Assume each entry in `db` has a unique video ID
        const recommendedVideos = new Set();
        const userIds = await User.find({}, "_id");

        if (userIds.length > 1) {
            // Step 1: Prepare the list of all video IDs and the user's preference vector

            const userVectorPromises = videoIds.map(async (videoId) => {
                // db[username].ups.has(videoId) ? 1 : // Liked
                // db[username].downs.has(videoId) ? -1 : // Disliked
                const vid = await Video.findById(videoId).exec();

                const liked = vid.likedBy;
                const disliked = vid.dislikedBy;
                return liked.includes(userId) ? 1 : disliked.includes(userId) ? -1 : 0; // No interaction
            });
            const userVector = await Promise.all(userVectorPromises);
            // console.log(`USER VECTOR = ${userVector}`);

            // Step 2: Calculate similarity with other users using the `compute-cosine-similarity` library
            const similarityScores = [];

            userIds.forEach(async (otherUser) => {
                if (otherUser !== userId) {
                    const otherUserVectorPromises = videoIds.map(async (videoId) => {
                        // db[otherUser].ups.has(videoId) ? 1 :
                        // db[otherUser].downs.has(videoId) ? -1 :
                        const vid = await Video.findById(videoId).exec();
                        const liked = vid.likedBy;
                        const disliked = vid.dislikedBy;

                        return liked.includes(otherUser)
                            ? 1
                            : disliked.includes(otherUser)
                                ? -1
                                : 0;
                    });
                    const otherUserVector = await Promise.all(otherUserVectorPromises);

                    const similarity = cosineSimilarity(userVector, otherUserVector);
                    similarityScores.push({ user: otherUser, similarity: similarity });
                }
            });

            // Step 3: Sort users by similarity in descending order
            similarityScores.sort((a, b) => b.similarity - a.similarity);

            // Step 4: Get recommended videos based on similar users
            for (const { user: similarUser } of similarityScores) {
                const similar_user = await User.findById(similarUser).exec();
                const otherLikes = similar_user.liked;
                for (const videoId of otherLikes) {
                    const u = await User.findById(user).exec();
                    if (!u.watched.includes(videoId)) {
                        // Only add if not already watched
                        recommendedVideos.add(videoId);
                        if (recommendedVideos.size >= count) break;
                    }
                }
                if (recommendedVideos.size >= count) break;
            }
        }

        // Step 5: Fallback to random unwatched videos if needed
        const unwatchedVideos = videoIds.filter(
            (videoId) => !user.watched.includes(videoId)
        );
        while (recommendedVideos.size < count && unwatchedVideos.length > 0) {
            const randomVideo = unwatchedVideos.splice(
                Math.floor(Math.random() * unwatchedVideos.length),
                1
            )[0];
            recommendedVideos.add(randomVideo);
        }

        // Step 6: Fallback to random watched videos if still needed
        const watchedVideos = videoIds.filter((videoId) =>
            user.watched.includes(videoId)
        );
        while (recommendedVideos.size < count && watchedVideos.length > 0) {
            const randomVideo = watchedVideos.splice(
                Math.floor(Math.random() * watchedVideos.length),
                1
            )[0];
            recommendedVideos.add(randomVideo);
        }

        // console.table("RESULT OF RECOMMENDED VIDEOS:");
        // recommendedVideos.forEach((video) => console.table(video));
        // Step 7: Format the response
        const promises = Array.from(recommendedVideos).map(async (id) => {
            //   console.log("Current ID ==== ", id._id);
            const video = await Video.findById(id._id);
            return {
                id: video.videoId,
                description: video.description || "",
                title: video.title || "",
                watched: user.watched.includes(id),
                liked: user.liked.includes(id)
                    ? true
                    : user.disliked.includes(id)
                        ? false
                        : null,
                likevalues: video.likes,
            };
        });

        const videoList = await Promise.all(promises);

        console.log("SENDING VIDEO LIST =====", videoList);
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
        console.log("Reached api/manifest/:id");

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        let id = req.params.id;

        console.log(`id: ${id}`);

        if (id.split(".").length == 1) {
            id += "_output.mpd";
        }
        console.log(`id: ${id}`);

        const mediaPath = path.resolve("/app/media");
        console.log(`path: ${mediaPath}/${id}`);
        res.sendFile(`${mediaPath}/${id}`);
    })
    .post("/api/like", async (req, res) => {
        console.log("Reached /api/like ....");
        // Check if user is currently logged in
        const uid = req.session.userId;
        if (!uid) {
            return res.status(200).json({
                status: "ERROR",
                error: true,
                message: "User is not logged in.",
            });
        }

        // Update video information.
        const { vid, value } = req.body;
        console.log("Video id:", vid);

        const likeValue = value == true ? 1 : value == false ? -1 : 0;

        const user = await User.findById(uid).exec();
        // console.log("USER ===", user);
        // .populate("liked")
        // .populate("disliked");

        const temp = await Video.findOne({ vid });
        // console.log("VIDEO OBJ ID: ", temp._id);
        // Check if user has liked/disliked vid before
        const foundInLiked = user.liked.includes(temp._id);
        const foundInDisliked = !foundInLiked
            ? user.disliked.includes(temp._id)
            : null;

        // If user has liked/disliked the video previously and the new value has not changed the previous value, send error
        console.log("/api/like Found In Liked: ", foundInLiked);
        console.log("/api/like Found In Disliked: ", foundInDisliked);
        console.log("/api/like Value: ", value);
        console.log("/api/like LikedValue: ", likeValue);

        if (
            (foundInLiked && likeValue == 1) ||
            (foundInDisliked && likeValue == -1)
        ) {
            console.log("Already liked/disliked video before....");
            return res.status(200).json({
                status: "ERROR",
                error: true,
                message: "Cannot set the same like value as previous.",
            });
        }
        // if (value) {
        const video = await Video.findOneAndUpdate(
            { vid },
            { $inc: { likes: likeValue } }
        );

        console.log("Incremented likes to ", video.likes);
        // const video = await Video.findOne({ vid }).exec();
        // .populate("likedBy")
        // .populate("dislikedBy");
        // console.log("/api/like VIDEO: ", video);
        if (likeValue === 1) {
            // video.likedBy.push(user._id);
            // user.liked.push(video._id);
            // await video.save();
            // await user.save();
            const newVid = await Video.findOneAndUpdate(
                { vid },
                { $push: { likedBy: uid } },
                { new: true }
            );
            console.log("api/like video: ", newVid.likedBy);
            console.log("api/like videoId: ", newVid._id);

            const newUser = await User.findOneAndUpdate(
                { _id: uid },
                { $push: { liked: newVid._id } },
                { new: true }
            );

            console.log("api/like user: ", newUser.liked);

            return res
                .status(200)
                .json({ status: "OK", message: { likes: newVid.likes } });
        } else if (likeValue === -1) {
            // video.dislikedBy.push(user._id);
            // user.disliked.push(video._id);
            // await video.save();
            // await user.save();

            const newVid = await Video.findOneAndUpdate(
                { vid },
                { $push: { dislikedBy: uid } },
                { new: true }
            );
            console.log("api/like video: ", newVid.dislikedBy);

            const newUser = await User.findOneAndUpdate(
                { _id: uid },
                { $push: { disliked: newVid._id } },
                { new: true }
            );
            console.log("api/like user: ", newUser.disliked);

            return res
                .status(200)
                .json({ status: "OK", message: { likes: newVid.likes } });
        }

        // console.log("api/like video: ", video);
        // console.log("api/like user: ", user);
        return res
            .status(200)
            .json({ status: "OK", message: { likes: video.likes } });
    })
    .post("/api/upload", upload.single("mp4File"), async (req, res) => {
        console.log("Reached api/upload");

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        const { author, title } = req.body;
        const mp4File = req.file;
        // console.log("body:", req.body);
        // console.log("mp4File:", mp4File);

        if (!author || !title || !mp4File) {
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
            description: "random",
            status: "processing",
            manifest: `${videoName}_output.mpd`,
        });

        await newVideo.save();
        const videoId = newVideo.videoId;
        await User.findByIdAndUpdate(req.session.userId, { $push: { videos: videoId } }, { new: true });

        res.status(200).json({ status: "OK", id: videoId });

        (
            async () => {
                // FFmpeg command to pad the video to 1280x720 with black bars
                const padCommand = `ffmpeg -i "videos/${videoName}" -vf "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2" -c:a copy "padded_videos/${videoName}" -y -loglevel error`;

                const thumbnailCommand = `ffmpeg -i "padded_videos/${videoName}" -vf 'scale=w=iw*min(320/iw\\,180/ih):h=ih*min(320/iw\\,180/ih),pad=320:180:(320-iw*min(320/iw\\,180/ih))/2:(180-ih*min(320/iw\\,180/ih))/2' -frames:v 1 "media/${videoName}_thumbnail.jpg" -y  -loglevel error`;

                const manifestCommand = `
        ffmpeg -i "padded_videos/${videoName}" \
            -map 0:v -b:v:0 254k -s:v:0 320x180 \
            -map 0:v -b:v:1 507k -s:v:1 320x180 \
            -map 0:v -b:v:2 759k -s:v:2 480x270 \
            -map 0:v -b:v:3 1013k -s:v:3 640x360 \
            -map 0:v -b:v:4 1254k -s:v:4 640x360 \
            -map 0:v -b:v:5 1883k -s:v:5 768x432 \
            -map 0:v -b:v:6 3134k -s:v:6 1024x576 \
            -map 0:v -b:v:7 4952k -s:v:7 1280x720 \
            -f dash -seg_duration 10 -use_template 1 -use_timeline 1 \
            -init_seg_name "${videoName}_chunk_init_$RepresentationID$.m4s" \
            -media_seg_name "${videoName}_chunk_$RepresentationID$_$Number$.m4s" \
            -adaptation_sets "id=0,streams=v" \
            "media/${videoName}_output.mpd"
            -loglevel error
        `;

                // Helper function to execute commands and return a Promise
                const execPromise = (command) => {
                    return new Promise((resolve, reject) => {
                        exec(command, (error, stdout, stderr) => {
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
                console.log("Executing padding command...");
                await execPromise(padCommand);

                // After padding completes, create the thumbnail
                console.log("Creating thumbnail now...");
                await execPromise(thumbnailCommand);

                // After thumbnail creation, execute the manifest command
                console.log("Creating chunk and mpd...");
                await execPromise(manifestCommand);

                newVideo.status = "complete";
                await newVideo.save();

                console.log("All commands executed successfully!");
            }
        )
    })
    .get("/api/processing-status", async (req, res) => {
        console.log("Reached api/processing-status");

        if (!req.session.userId) {
            return res.status(200).json({ status: "ERROR", error: true, message: "User not logged in" });
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
    // This route checks for whether the specific user likes the video
    .post("/api/check-feedback", async (req, res) => {
        const uid = req.session.userId;
        if (!uid) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }
        const { vid } = req.body;
        const user = await User.findById(uid)
            .populate("liked")
            .populate("disliked");

        const foundInLiked = user.liked.find((video) => video.videoId === vid);
        const foundInDisliked = user.disliked.find(
            (video) => video.videoId === vid
        );

        const result = foundInLiked ? true : foundInDisliked ? false : null;

        // const feedbacks = client.getUserFeedback(uid);

        // const foundFeedback = feedbacks.filter(
        //   (feedback) => feedback.itemId === vid
        // );
        // if (foundFeedback) {
        //   console.table(foundFeedback);
        //   const feedbackType = foundFeedback.feedbackType;
        //   const result =
        //     feedbackType === "like"
        //       ? true
        //       : feedbackType === "read" && feedbackType !== "star"
        //       ? false
        //       : null;

        res.status(200).json({ status: "OK", message: { feedback: result } });
        // }
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


        const targetVid = await Video.findOne({ videoId: id });

        // console.log("Video found from id: ", targetVid);
        console.log(`User watched ${user.watched}`);
        const foundVideo = user.watched.includes(targetVid.videoId);
        let previouslyWatched = false;
        if (foundVideo) {
            console.log(`User ${user.username} already viewed ${id}`);
            previouslyWatched = true;
        } else {
            console.log(`User ${user.username} has not viewed ${id}`);
            user.watched.push(id);
            await user.save();
        }
        return res.status(200).json({ status: "OK", viewed: previouslyWatched });
    });

export default router;
