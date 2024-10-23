const express = require("express");
const session = require("express-session"); // for session management
const MongoStore = require("connect-mongo"); //access to DB for session data
const connectDB = require("./config/dbConfig");
const authRoutesRouter = require("./routes/authRoutes");
const path = require("path");

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
// app.use(express.static(path.join(__dirname, "public")));

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

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
