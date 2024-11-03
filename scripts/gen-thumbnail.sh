#!/bin/bash
# Make sure your current directory is milestone1
# Loop over all mp4 files in the "videos" folder
for video in ../videos/*.mp4; do
    # Get the filename without the path and extension
    filename=$(basename "$video" .mp4)
    
    # Create a directory named after the video file
    mkdir -p "../media"
    output_dir="../media"

    ffmpeg -i "$video" \
    -vf "scale=w=iw*min(320/iw\,180/ih):h=ih*min(320/iw\,180/ih),pad=320:180:(320-iw*min(320/iw\,180/ih))/2:(180-ih*min(320/iw\,180/ih))/2" \
    -frames:v 1 \
    -c:a copy \
    "${output_dir}/${filename}_thumbnail.jpg" -y

    echo "Generated thumbnail of $video at ${output_dir}/${filename}_thumbnail.jpg"
done