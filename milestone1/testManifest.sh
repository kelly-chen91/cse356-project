# Run the ffmpeg command and place output in the respective folder
video="videos/1580117-uhd_3840_2160_30fps.mp4"
filename=$(basename "$video" .mp4)

# ffmpeg -i "$video" \
# -map 0:v -b:v:0 254k -s:v:0 320x180 \
# -map 0:v -b:v:1 507k -s:v:1 320x180 \
# -map 0:v -b:v:2 759k -s:v:2 480x270 \
# -map 0:v -b:v:3 1013k -s:v:3 640x360 \
# -map 0:v -b:v:4 1254k -s:v:4 640x360 \
# -map 0:v -b:v:5 1883k -s:v:5 768x432 \
# -map 0:v -b:v:6 3134k -s:v:6 1024x576 \
# -map 0:v -b:v:7 4952k -s:v:7 1280x720 \
# -f dash -seg_duration 10 -use_template 1 -use_timeline 1 \
# -init_seg_name "${filename}_chunk_$Bandwidth$_init.m4s" \
# -media_seg_name "${filename}_chunk_$Bandwidth$_$Number$.m4s" \
# -adaptation_sets "id=0,streams=v" \
# "test/test_output.mpd"


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
-init_seg_name "${filename}_chunk_\$RepresentationID\$_\$Bandwidth\$_init.m4s" \
-media_seg_name "${filename}_chunk_\$RepresentationID\$_\$Bandwidth\$_\$Number\$.m4s" \
-adaptation_sets "id=0,streams=v" \
"test/test_output.mpd"
