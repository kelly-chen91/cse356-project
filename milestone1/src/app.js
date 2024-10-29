const express = require("express");
const session = require("express-session"); // for session management
const MongoStore = require("connect-mongo"); //access to DB for session data
const connectDB = require("./config/dbConfig");
const authRoutesRouter = require("./routes/authRoutes");
const path = require("path");
const cors = require('cors');

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
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URL }),
    })
);

// Middleware for JSON and parsing requests
// app.use(express.static(path.join(__dirname, "public")));
app.use(cors({
    origin: 'http://doitand711gang.cse356.compas.cs.stonybrook.edu:80',
    // methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.setHeader("X-CSE356", "66d11e647f77bf55c5003c0b");
    next();
});

app.use("/", authRoutesRouter);

const User = require("./models/users");

// Placeholder for routes and server logic
app.get("/", (req, res) => {
    console.log("root path...");
    if (!req.session.userId) {
        // User not logged in, send to login page
        res.sendFile(__dirname + "/public/components/LoginPage.html");
        // return res
        //   .status(401)
        //   .json({ status: "ERROR", error: true, message: "User not logged in" });
    } else res.sendFile(__dirname + "/public/index.html");
    // res.send("API running...");
});

// Get user to sign up page
app.get("/SignupPage.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "components", "SignupPage.html"));
});

// Get user to sign up page
app.get("/play/:id", (req, res) => {
    const id = req.params.id;
    console.log("Reached /play/:id => id =", id);

    res.sendFile(path.join(__dirname, "/public/play.html"));
});



// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
