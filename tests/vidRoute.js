import mongoose from "mongoose";
import User from "../src/models/users.js";
import Video from "../src/models/videos.js";
import cosineSimilarity from "compute-cosine-similarity";

mongoose
  .connect("mongodb://root:example@localhost:27017/warmup?authsource=admin", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");
    // Global variables
    const userId = "6735a064c21babc3290a94cd";
    const count = 10;

    // Cache all users and videos at once
    const [users, videos] = await Promise.all([
      User.find({}).exec(),
      Video.find({}).exec(),
    ]);
    const userMap = users.reduce(
      (map, user) => ((map[user._id] = user), map),
      {}
    );
    const videoMap = videos.reduce(
      (map, video) => ((map[video.videoId] = video), map),
      {}
    );

    console.log(users);

    const recommendedVideos = new Set();
    const user = userMap[userId];

    if (users.length > 1) {
      // Step 1: Prepare the list of all video IDs and the user's preference vector

      const userVector = videos.map((vid) => {
        // db[username].ups.has(videoId) ? 1 : // Liked
        // db[username].downs.has(videoId) ? -1 : // Disliked

        const liked = vid.likedBy;
        const disliked = vid.dislikedBy;
        return liked.includes(userId) ? 1 : disliked.includes(userId) ? -1 : 0; // No interaction
      });
      console.log(`USER VECTOR = ${userVector}`);

      // Step 2: Calculate similarity with other users using the `compute-cosine-similarity` library
      const similarityScores = [];

      users.forEach((otheruser) => {
        const otherUser = otheruser._id;
        if (otherUser !== userId) {
          const otherUserVector = videos.map((vid) => {
            // db[otherUser].ups.has(videoId) ? 1 :
            // db[otherUser].downs.has(videoId) ? -1 :
            const liked = vid.likedBy;
            const disliked = vid.dislikedBy;

            return liked.includes(otherUser)
              ? 1
              : disliked.includes(otherUser)
              ? -1
              : 0;
          });
          const similarity = cosineSimilarity(userVector, otherUserVector);
          similarityScores.push({ user: otherUser, similarity: similarity });
        }
      });

      // Step 3: Sort users by similarity in descending order
      similarityScores.sort((a, b) => b.similarity - a.similarity);

      // console.log(similarityScores);

      // Step 4: Get recommended videos based on similar users
      for (const { user: similarUser } of similarityScores) {
        const similar_user = userMap[similarUser];
        const otherLikes = similar_user.liked;
        for (const videoId of otherLikes) {
          if (!user.watched.includes(videoId) && videoMap[videoId].status !== 'processing') {
            // Only add if not already watched
            recommendedVideos.add(videoId);
            if (recommendedVideos.size >= count) break;
          }
        }
        if (recommendedVideos.size >= count) break;
      }
    }

    // Step 5: Fallback to random unwatched videos if needed
    const unwatchedVideos = videos.filter(
      (vid) =>
        !user.watched.includes(vid.videoId) && vid.status !== "processing"
    );
    while (recommendedVideos.size < count && unwatchedVideos.length > 0) {
      const randomVideo = unwatchedVideos.splice(
        Math.floor(Math.random() * unwatchedVideos.length),
        1
      )[0];
      recommendedVideos.add(randomVideo);
    }

    // Step 6: Fallback to random watched videos if still needed
    const watchedVideos = videos.filter(
      (vid) => user.watched.includes(vid.videoId) && vid.status !== "processing"
    );
    while (recommendedVideos.size < count && watchedVideos.length > 0) {
      const randomVideo = watchedVideos.splice(
        Math.floor(Math.random() * watchedVideos.length),
        1
      )[0];
      recommendedVideos.add(randomVideo);
    }

    // console.table("RESULT OF RECOMMENDED VIDEOS:");
    console.log(recommendedVideos);

    // Step 7: Format the response
    const videoList = Array.from(recommendedVideos).map((video) => {
      //   console.log("Current ID ==== ", id._id);
      return {
        id: video.videoId,
        description: video.description || "",
        title: video.title || "",
        watched: user.watched.includes(video.videoId),
        liked: user.liked.includes(video.videoId)
          ? true
          : user.disliked.includes(video.videoId)
          ? false
          : null,
        likevalues: video.likes,
        manifest: video.manifest,
      };
    });

    console.log("SENDING VIDEO LIST =====");
    console.log(videoList);

    mongoose.disconnect();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    mongoose.disconnect();
  });
