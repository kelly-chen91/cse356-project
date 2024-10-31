#!/bin/bash
# Make sure your current directory is milestone1
# Loop over all mp4 files in the "videos" folder
for video in ../videos/*.mp4; do
    # Get the filename without the path and extension
    filename=$(basename "$video" .mp4)

    mkdir -p "padded_videos"

    # Reprocess the video to 16:9 with black padding.
    ffmpeg -i "$video" \
    -vf "scale=w=iw*min(1280/iw\,720/ih):h=ih*min(1280/iw\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\,720/ih))/2:(720-ih*min(1280/iw\,720/ih))/2" \
    -c:a copy \
    "padded_videos/${filename}.mp4" -y

    echo "Padded padded_videos/${filename}.mp4"
done