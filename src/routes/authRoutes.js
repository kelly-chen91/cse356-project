import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import User from "../models/users.js";
import winston from "winston";
const logger = winston.createLogger({
    transports: [
      new winston.transports.Console(), // Log to console
      new winston.transports.File({ filename: 'app.log' }), // Log to file
    ],
  });

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
        logger.info("/adduser");
        let { username, password, email } = req.body;
        // logger.info(`BEFORE EMAIL===== ${email}`);

        // email = encodeURI(email).replace(/%20/g, "+");
        // logger.info(`EMAIL===== ${email}, PASSWORD ==== ${password}`);
        const ccEmail =
            "kelly.chen.6@stonybrook.edu, zhenting.ling@stonybrook.edu, mehadi.chowdhury@stonybrook.edu";

        // Check for duplicate user
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) {
            // logger.info(`${username} ALREADY EXISTS`);
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
        logger.info(`${username} CREATED with id ${newUser._id}`);

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
            // logger.info("USER=====", newUser);
            if (error) {
                logger.info("VERIFICATION ERROR=====", error);

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
        logger.info("/api/login");
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        // logger.info(user);
        // logger.info(req.cookies);
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

        // logger.info(req.session);

        req.session.userId = user._id;
        res.status(200).json({ status: "OK", message: "Login successful" });
    })
    .post("/api/logout", (req, res) => {
        logger.info("Logging out...");
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
        logger.info("/verify");
        // console.table(req.query);
        email = encodeURI(email).replace(/%20/g, "+");
        const data = await User.findOne({ email });

        if (!data)
            return res
                .status(200)
                .json({ status: "ERROR", error: true, message: "User not found" });
        // logger.info("user found");
        // If user's verification key is correct, we log the user in and redirect them to home page
        // If it is not correct, we redirect to login page
        // if (key !== data.verificationKey) {
        //     res.sendFile(
        //         __dirname +
        //         "/root/cse356-project/milestone1/src/public/components/LoginPage.html"
        //     );
        // } else {
        const user = await User.updateOne({ _id: data._id }, { verified: true });
        // logger.info(user);
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
    });

export default router;
