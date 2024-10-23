const express = require("express");
const session = require("express-session"); // for session management
const MongoStore = require("connect-mongo"); //access to DB for session data
const connectDB = require("./config/dbConfig");
const authRoutesRouter = require("./routes/authRoutes");
require("dotenv").config();

// Connect to MongoDB
connectDB();
// Initialize the app
const app = express();
app.use(
    session({
        secret: "supersecret difficult to guess string",
        cookie: { httpOnly: true, maxAge: 100 * 60 * 60 },
        resave: false,
        saveUninitialize: false,
        // store: MongoStore.create({ mongoUrl: "mongodb://127.0.0.1/warmup" }),
    })
);


// Middleware for JSON and parsing requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.setHeader('X-CSE356', '66d11e647f77bf55c5003c0b');
    next();
});

app.use("/", authRoutesRouter);

const User = require("./models/users");

// Placeholder for routes and server logic
app.get("/", (req, res) => {
    console.log("root path...")
    if (!req.session.userId) {
        return res
            .status(200)
            .json({ status: "ERROR", error: true, message: "Failed to send email" });
    }

    res.sendFile(__dirname + '/public/index.html');
    // res.send("API running...");
});

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
