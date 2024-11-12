// Getting all packages.
import express from "express";
import session from "express-session"; // for session management
import MongoStore from "connect-mongo"; //access to DB for session data
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// Getting project modules.
import { connectDB } from "./config/dbConfig.js";
import authRoutesRouter from "./routes/authRoutes.js";

// Connect to MongoDB
connectDB();

// Some pages.
const loginPage = path.resolve("/app/src/public/components/LoginPage.html");
const indexPage = path.resolve("/app/src/public/index.html");
const signUpPage = path.resolve("/app/src/public/components/SignupPage.html");
const playPage = path.resolve("/app/src/public/play.html");

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
app.use(
  cors({
    origin: "0.0.0.0:80",
    // methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("X-CSE356", "66d11e647f77bf55c5003c0b");
  next();
});

app.use("/", authRoutesRouter);

// Placeholder for routes and server logic
app.get("/", (req, res) => {
  console.log("root path...");

  if (!req.session.userId) {
    // User not logged in, send to login page
    res.sendFile(loginPage);
  } else res.sendFile(indexPage);
});

// Get user to sign up page
app.get("/SignupPage.html", (req, res) => {
  res.sendFile(signUpPage);
});

// Get user to sign up page
app.get("/play/:id", (req, res) => {
  const id = req.params.id;
  console.log("Reached /play/:id => id =", id);

  res.sendFile(playPage);
});

// Upload page
app.get("/upload", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/components/UploadPage.html"));
  });

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
