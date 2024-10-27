const fs = require("fs");
const path = require("path");
const express = require("express");
const User = require("../models/users");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const uuid = require("uuid");

const router = express.Router();

//define routes for user
//1. Sign in
//  Checks if the email exists in database
//  If email exists, compare with the hashed password in the database
//  If email does not exist or the password does not match to the database, throw error
//2. Sign out
//  Destroy the session
//  Return to welcome page
//3. Sign up
//  Checks if the email exists in database
//  If email exists, return an error saying the email already exists
//  If email does not exist, proceed to hash the password and add to the database
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
    console.log(`EMAIL===== ${email}`);
    const ccEmail = "kelly.chen.6@stonybrook.edu, zhenting.ling@stonybrook.edu";

    // Check for duplicate user
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      console.log(`${username} ALREADY EXISTS`);
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User already exists" });
    }

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
    console.log(`${username} CREATED`);

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
  .get("/media/output.mpd", async (req, res) => {
    console.log("Reached media/output.mpd");
    console.log(req.session);

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    return res.sendFile("/root/MPEG-DASH_media_player/media/output.mpd");
  })
  .get("/media/chunk_:bandwidth_:segment.m4s", async (req, res) => {
    console.log("Reached media/chunk...m4s");
    // console.log(req.session);

    const bandwidth = req.params["bandwidth"];
    const segment_num = req.params["segment"];
    // console.log("Req params:", bandwidth, segment_num)

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Manifest sent successfully" });
  })
  .get("/media", async (req, res) => {
    console.log("Reached /media");
    console.log(req.originalUrl);

    return res
      .status(200)
      .json({ status: "OK", message: "Manifest sent successfully" });
  })
  .get("/media/chunk_:bandwidth_:segment.m4s", async (req, res) => {
    console.log("Reached media/chunk...m4s");
    // console.log(req.session);

    const bandwidth = req.params["bandwidth"];
    const segment_num = req.params["segment"];
    // console.log("Req params:", bandwidth, segment_num)

    if (!req.session.userId) {
      return res
        .status(200)
        .json({ status: "ERROR", error: true, message: "User not logged in" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Manifest sent successfully" });
  })
  .post("api/videos", (req, res) => {
    const { count } = req.body;
    console.log(`Sending ${count} videos to frontend...`);

    const videosPath = path.resolve("../milestone1/videos");

    const videoNames = fs.readdirSync(videosPath);
    videoNames.pop(); // remove m1.json

    fs.readFile(path.join(videosPath, "m1.json"), "utf8", (err, content) => {
      if (err) {
        return res
          .status(200)
          .json({ status: "ERROR", error: true, message: err.message });
      }

      const videoMetadatas = [];
      const videoList = JSON.parse(content);
      for (let i = 0; i < count; i++) {
        const videoName =
          videoNames[Math.floor(Math.random() * videoNames.length)];

        videoMetadatas.push({
          title: videoName,
          description: videoList[videoName],
        });
      }
      return res.status(200).json({
        status: "OK",
        videos: videoMetadatas,
        message: "Successfully sent videos",
      });
    });
  })
  .get("/api/thumbnail/:id", (res, req) => {
    const { id } = req.params.id;
  })
  .get("/api/manifest/:id", (res, req) => {
    const { id } = req.params.id;
  });

module.exports = router;
