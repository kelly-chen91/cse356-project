#!/bin/bash

# Loop over all mp4 files in the "videos" folder
for video in videos/*.mp4; do
    # Get the filename without the path and extension
    filename=$(basename "$video" .mp4)
    
    # Create a directory named after the video file
    mkdir -p "media/$filename"
    output_dir="media/$filename"
    
    # Run the ffmpeg command and place output in the respective folder
    ffmpeg -i "$video" \
    -map 0:v -b:v:0 254k -s:v:0 320x180 \
    -map 0:v -b:v:1 507k -s:v:1 320x180 \
    -map 0:v -b:v:2 759k -s:v:2 480x270 \
    -map 0:v -b:v:3 1013k -s:v:3 640x360 \
    -map 0:v -b:v:4 1254k -s:v:4 640x360 \
    -map 0:v -b:v:5 1883k -s:v:5 768x432 \
    -map 0:v -b:v:6 3134k -s:v:6 1024x576 \
    -map 0:v -b:v:7 4952k -s:v:7 1280x720 \
    -f dash -seg_duration 10 -use_template 1 -use_timeline 1 \
    -init_seg_name "chunk_\$Bandwidth\$_init.m4s" \
    -media_seg_name "chunk_\$Bandwidth\$_\$Number\$.m4s" \
    -adaptation_sets "id=0,streams=v" \
    "$output_dir/output.mpd"

    ffmpeg -i "$video" -vf "scale=320:180" -frames:v 1 "$output_dir/thumbnail.jpg"
    # echo "Processed $video to $output_dir/output.mpd"
done