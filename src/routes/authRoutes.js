// Overriding require so that we can have import and require together.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { Gorse } from "gorsejs";
const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
// const uuid = require("uuid");

import User from "../models/users.js";
import Video from "../models/videos.js";
import mongoose from "mongoose";
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
const { exec } = require('child_process');
// const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// const ffmpeg = require('fluent-ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegPath);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'videos/'); // Specify the destination folder
    },
    filename: function (req, file, cb) {
        // Use the original filename and add a unique identifier to avoid overwrites
        cb(null, `${file.originalname}`);
    }
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

// instantiate the gorse client.
const gorse = new Gorse({
    endpoint: "http://gorse:8088",
    secret: "zhenghaoz",
});

router
    .post("/api/adduser", async (req, res) => {
        console.log("/adduser");
        let { username, password, email } = req.body;
        console.log(`BEFORE EMAIL===== ${email}`);

        // email = encodeURI(email).replace(/%20/g, "+");
        console.log(`EMAIL===== ${email}`);
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

        // Saving user to gorse.
        const uid = newUser._id;
        await gorse
            .insertUser({
                userId: uid,
                labels: [], // Optional labels for the user
            })
            .then((response) => {
                console.log(`User ${uid} added to gorse:`, response);
            })
            .catch((error) => {
                console.error(`Error adding user ${uid} to gorse:`, error);
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
        const { count } = req.body;
        const userId = req.session.userId;
        console.log(`Sending ${count} videos to ${userId}...`);

        // This is the part where we start using Gorse to get recommendations.
        let videoNames = gorse.getRecommend({
            userId: userId,
            cursorOptions: { n: count },
        });
        const user = await User.findById(userId);
        // The result
        const metadata = [];
        console.log(`Received ${videoNames} from gorse.`);
        for (const vid in videoNames) {
            // Get the feedback for this user.
            let userFeedback = null;
            gorse
                .getFeedback({ userId: userId, itemId: vid })
                .then((res) => {
                    userFeedback = res;
                })
                .catch((err) => {
                    console.log(
                        `Error while getting feedback for user ${userId}: ${err}`
                    );
                });

            // Gather data for this video.
            Video.findById(vid)
                .then((res) => {
                    metadata.push({
                        id: res._id,
                        description: res.description,
                        title: res.title,
                        watched: user.watched.contains(vid) ? true : false,
                        liked:
                            userFeedback.FeedbackType === "like"
                                ? true
                                : userFeedback.FeedbackType === "read" &&
                                    !(userFeedback.FeedbackType === "star")
                                    ? false
                                    : null,
                        likevalues: res.likes,
                    });
                })
                .catch((err) => {
                    console.log(`Error while retrieving video meta data from db: ${err}`);
                });
        }

        return res.status(200).json({
            status: 200,
            videos: metadata,
            message: "Successfully sent videos",
        });
    })
    .get("/api/thumbnail/:id", (req, res) => {
        console.log("Reached api/thumbnail/:id");

        const id = req.params.id;

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

        console.log(`id: ${id}`);
        let id = req.params.id;
        if (id.split(".").length == 1) {
            id += "_output.mpd";
        }
        console.log(`id: ${id}`);

        const mediaPath = path.resolve("/app/media");
        console.log(`path: ${mediaPath}/${id}`);
        res.sendFile(`${mediaPath}/${id}`);
    })
    .post("/api/like", async (req, res) => {
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

        const likeValue = value == true ? 1 : value == false ? -1 : 0;
        // if (value) {
        await Video.updateOne({ videoId: vid }, { $inc: { likes: 1 } });
        // Update user likes video with Gorse
        client
            .insertFeedback("view", [
                {
                    user_id: uid,
                    item_id: vid,
                    timestamp: new Date().toISOString(), // optional
                },
            ])
            .then((response) => {
                console.log(`${uid} updated feedback on ${vid}`, response);
                Video.find({ videoId: vid }).then((vidData) => {
                    const totalLikes = vidData.likes;
                    res
                        .status(200)
                        .json({ status: "OK", message: { likes: totalLikes } });
                });
            })
            .catch((error) => {
                console.error(`${uid} had error update feedback on ${vid}:`, error);
            });
    })
    .post("/api/upload", upload.single('mp4File'), async (req, res) => {
        console.log("Reached api/upload");

        if (!req.session.userId) {
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not logged in" });
        }

        const { author, title } = req.body;
        const mp4File = req.file;
        console.log("body:", req.body);
        console.log("mp4File:", mp4File)

        if (!author || !title || !mp4File) {
            return res.status(400).json({ status: "ERROR", error: true, message: "Missing required fields" });
        }

        const videoId = uuidv4();

        res.status(200).json({ status: "OK", id: videoId });

        const newVideo = new Video({
            uuid: videoId,
            author: author,
            title: title,
            description: "random",
            status: "processing"
        })

        await newVideo.save();

        const user = await User.findById(req.session.userId).exec();
        if (user) {
            user.videos.push(videoId);
            await user.save();
        }

        const videoName = mp4File.originalname;

        // FFmpeg command to pad the video to 1280x720 with black bars
        const padCommand = `ffmpeg -i "videos/${videoName}" -vf "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2" -c:a copy "padded_videos/${videoName}" -y`;

        const thumbnailCommand = `ffmpeg -i "padded_videos/${videoName}" -vf 'scale=w=iw*min(320/iw\\,180/ih):h=ih*min(320/iw\\,180/ih),pad=320:180:(320-iw*min(320/iw\\,180/ih))/2:(180-ih*min(320/iw\\,180/ih))/2' -frames:v 1 "${videoName}_thumbnail.jpg" -y`;

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
            const videoStatusPromises = user.videos.map(async vId => {
                const video = await Video.findOne({ uuid: vId }).exec();
                console.log(video);
                return { id: vId, title: video.title, status: video.status };
            });
            const videoStatus = await Promise.all(videoStatusPromises);
            console.log("Video statuses:", videoStatus);
            return res.status(200).json({ status: "OK", videos: videoStatus });
        }
    });

export default router;
