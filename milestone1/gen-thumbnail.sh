#!/bin/bash
# Make sure your current directory is milestone1
# Loop over all mp4 files in the "videos" folder
for video in videos/*.mp4; do
    # Get the filename without the path and extension
    filename=$(basename "$video" .mp4)
    
    # Create a directory named after the video file
    mkdir -p "media"
    output_dir="media"

    ffmpeg -i "$video" -vf "scale=320:180" -frames:v 1 "${output_dir}/${filename}_thumbnail.jpg"

    echo "Generated thumbnail of $video at ${output_dir}/${filename}_thumbnail.jpg"
done