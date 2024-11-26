const videoContainer = document.getElementById("container");
const videos = [];
async function getVideos(count) {
    const response = await fetch(
        "http://doit.cse356.compas.cs.stonybrook.edu/api/videos",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ count }),
        }
    );

    if (response.ok) {
        const videoMetadatas = await response.json();
        console.log(videoMetadatas);
        videoMetadatas.videos.forEach((video) => {
            videos.push(video.id);
            loadVideo(video.id);
        });
    }
    // console.log(videos)
}

async function loadVideo(id) {
    var video = document.createElement("video");
    video.controls = true;
    video.width = 1280;
    video.dataset.id = id;

    var videoContainer = document.createElement("div");
    videoContainer.className = "video-wrapper";

    var player = dashjs.MediaPlayer().create();
    player.initialize(
        video,
        `http://doit.cse356.compas.cs.stonybrook.edu/api/manifest/${id}_output.mpd`,
        true
    );

    console.log("CALLING API/VIEW");
    /**
      @TODO Make API call to /api/view to mark video as viewed
      */
    await fetch(
        "http://doit.cse356.compas.cs.stonybrook.edu/api/view",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: id }),
            // body: id,
        }
    );

    const playPauseBtn = document.createElement("div");
    playPauseBtn.id = "playPauseBtn";
    playPauseBtn.innerHTML = "Play/Pause";

    playPauseBtn.addEventListener("click", function () {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });

    // Like/Dislike button
    const likeBtn = document.createElement("button");
    likeBtn.id = "likeBtn";
    likeBtn.name = "like";
    likeBtn.innerHTML = "Like";
    likeBtn.addEventListener("click", async function () {
        console.log("SENDING LIKES ....");
        await updateLike(id, true);
    });

    const dislikeBtn = document.createElement("button");
    dislikeBtn.id = "dislikeBtn";
    dislikeBtn.name = "dislike";
    dislikeBtn.innerHTML = "Dislike";
    dislikeBtn.addEventListener("click", async function () {
        console.log("SENDING DISLIKES ....");

        await updateLike(id, false);
    });

    videoContainer.appendChild(video);
    videoContainer.appendChild(playPauseBtn);
    videoContainer.appendChild(likeBtn);
    videoContainer.appendChild(dislikeBtn);
    // videoContainer.appendChild(seekBtn);
    // videoContainer.appendChild(resolutionSelect);
    container.appendChild(videoContainer);
}

// Function to handle URL update
function updateUrl(videoId) {
    history.pushState(
        null,
        null,
        `http://doit.cse356.compas.cs.stonybrook.edu/play/${videoId}`
    );
}

// Function to load initial and subsequent videos
let currentPage = 0;
let isLoading = false;

async function loadVideos() {
    if (isLoading) return;
    isLoading = true;

    const videos = await getVideos(10);
    videos.forEach(async (video) => {
        await loadVideo(video.id);
    });

    currentPage++;
    isLoading = false;
}

// Intersection Observer to detect the last video
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const videoId = entry.target.querySelector("video").dataset.id;
                updateUrl(videoId);

                // Load more videos if this is the last one
                if (entry.target === videoContainer.lastElementChild) {
                    loadVideos();
                }
            }
        });
    },
    { root: null, rootMargin: "200px", threshold: 0.5 }
);

// Initialize the infinite scroll
async function initialize() {
    await loadVideos(); // Load initial set of videos
    const videos = document.querySelectorAll(".video-wrapper");
    videos.forEach((video) => observer.observe(video));
}

// Observe new videos as they are added
const mutationObserver = new MutationObserver(() => {
    const newVideos = document.querySelectorAll(
        ".video-wrapper:not([data-observed])"
    );
    newVideos.forEach((video) => {
        observer.observe(video);
        video.setAttribute("data-observed", "true");
    });
});

mutationObserver.observe(videoContainer, { childList: true });

await initialize();
