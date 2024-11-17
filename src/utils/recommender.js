import Video from "../models/videos.js";
import User from "../models/users.js";
import cosineSimilarity from "compute-cosine-similarity";

/**
 * This is a function that makes query to the
 * @returns [users, videos, userMap, videoMap]
 */
async function getVideosUsersMap() {
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
  return [users, videos, userMap, videoMap];
}

/**
 * Step 5: Fallback to random unwatched videos if needed
 * @param recommendedVideos
 * @param videos
 * @param user
 * @returns list of recommended videos.
 */
function fallback_unwatched(recommendedVideos, videos, user) {
  const unwatchedVideos = videos.filter(
    (vid) => !user.watched.includes(vid.videoId) && vid.status !== "processing"
  );

  while (recommendedVideos.size < count && unwatchedVideos.length > 0) {
    const randomVideo = unwatchedVideos.splice(
      Math.floor(Math.random() * unwatchedVideos.length),
      1
    )[0];
    recommendedVideos.add(randomVideo);
  }
  return recommendedVideos;
}

/**
 * Step 6: Fallback to random watched videos if still needed
 * @param recommendedVideos
 * @param videos
 * @param user
 * @returns list of recommended videos object.
 */
function fallback_random(recommendedVideos, videos, user) {
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
  return recommendedVideos;
}

/**
 * Step 7: Format the response using recommended video objects.
 * @returns list of recommended videos.
 */
function formatResponse(recommendedVideos, user) {
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
      // manifest: video.manifest,
    };
  });
  return videoList;
}

export async function similarVideosByUser(userId, count) {
  const recommendedVideos = new Set();
  const user = userMap[userId];

  const [users, videos, userMap, videoMap] = await getVideosUsersMap();

  if (users.length > 1) {
    // Step 1: Prepare the list of all video IDs and the user's preference vector
    const userVector = videos.map((vid) => {
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

    // Step 4: Get recommended videos based on similar users
    for (const { user: similarUser } of similarityScores) {
      const similar_user = userMap[similarUser];
      const otherLikes = similar_user.liked;
      for (const videoId of otherLikes) {
        if (!user.watched.includes(videoId)) {
          // Only add if not already watched
          recommendedVideos.add(videoMap[videoId]);
          if (recommendedVideos.size >= count) break;
        }
      }
      if (recommendedVideos.size >= count) break;
    }
  }

  fallback_unwatched(recommendedVideos, videos, user);
  fallback_random(recommendedVideos, videos, user);
  const videoList = formatResponse(recommendedVideos, user);

  console.log("SENDING VIDEO LIST =====");
  console.log(videoList);

  return videoList;
}

export function similarVideosByVideos(videoId, count) {
  return 1;
}
