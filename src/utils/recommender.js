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
function fallback_unwatched(recommendedVideos, videos, user, count) {
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
function fallback_random(recommendedVideos, videos, user, count) {
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
    //   console.log(recommendedVideos);
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

export function similarVideosByUser(users, videos, userMap, videoMap, userId, recommendedVideos, count) {
    console.log(`Reached video-based for user ${userId}`);

    const user = userMap[userId];

    if (users.length > 1) {
        // Step 1: Prepare the user's preference vector
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

        console.log("SIMILARITY SCORES ===========> ",similarityScores);

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

    return recommendedVideos;
}

export function similarVideosByVideos(video, userId, users, videos, userMap, videoMap, recommendedVideos, count) {
    const videoId = video.id

    const user = userMap[userId];

    if (users.length > 1) {
        // Step 1: Prepare the video preference vector.
        const videoVector = users.map((uid) => {
            const liked = uid.liked;
            const disliked = uid.disliked;
            return liked.includes(videoId) ? 1 : disliked.includes(videoId) ? -1 : 0; // No interaction
        });
        console.log(`VIDEO VECTOR = ${videoVector}`);

        // Step 2: Calculate similarity with other videos using the `compute-cosine-similarity` library
        const similarityScores = [];

        videos.forEach((other) => {
            const otherVid = other.videoId;
            if (otherVid !== videoId) {
                const otherVideoVector = users.map((uid) => {
                    const liked = uid.liked;
                    const disliked = uid.disliked;
                    return liked.includes(otherVid)
                        ? 1
                        : disliked.includes(otherVid)
                            ? -1
                            : 0;
                });
                const similarity = cosineSimilarity(videoVector, otherVideoVector);
                similarityScores.push({ video: otherVid, similarity: similarity });
            }
        });

        // Step 3: Sort users by similarity in descending order
        similarityScores.sort((a, b) => b.similarity - a.similarity);
        console.log("Similarity Scores===", similarityScores)

        // Step 4: Get recommended videos based on similar videos
        for (const { video: similarVideo } of similarityScores) {
            const similar_video = videoMap[similarVideo];
            if (!user.watched.includes(similarVideo)) {
                // Only add if not already watched
                recommendedVideos.add(similar_video);
                if (recommendedVideos.size >= count) break;
            }
            if (recommendedVideos.size >= count) break;
        }
    }

    return recommendedVideos;
}

export async function getRecommendation(mode, userId, videoId, count) {
    // Prepare variables to store information.
    const [users, videos, userMap, videoMap] = await getVideosUsersMap();

    const recommendedVideos = new Set();
    const user = userMap[userId];

    console.log(`Gathering Recommendation for user: ${user}`);

    // Get similar videos by item based rec.
    if (mode === 'item-based') {
        similarVideosByVideos(videoId, userId, users, videos, userMap, videoMap, recommendedVideos, count);
    }

    // Get similar videos by user based rec.
    similarVideosByUser(users, videos, userMap, videoMap, userId, recommendedVideos, count);

    // Fall backs.
    fallback_unwatched(recommendedVideos, videos, user, count);
    fallback_random(recommendedVideos, videos, user, count);

    // Wrap the video into videoList. Return videoList.
    const videoList = formatResponse(recommendedVideos, user);

    console.log("SENDING VIDEO LIST =====");
    console.log(videoList);

    return videoList;
}
