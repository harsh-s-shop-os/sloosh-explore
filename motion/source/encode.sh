#!/bin/sh
# encode one rendered composition: WebM (VP9) + MP4 (H.264), poster (first frame) and still (finished frame)
set -e
T=$1; W=$2
D=/tmp/claude-0/mcpm/render/$T; O=/tmp/claude-0/mcpm/out; mkdir -p $O
ffmpeg -v error -y -framerate 30 -i $D/f%04d.png -vf "scale=$W:-2:flags=lanczos,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -deadline good -cpu-used 2 -an $O/$T.webm
ffmpeg -v error -y -framerate 30 -i $D/f%04d.png -vf "scale=$W:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 21 -movflags +faststart -an $O/$T.mp4
ffmpeg -v error -y -i $D/f0000.png -vf "scale=$W:-2:flags=lanczos" -c:v libwebp -quality 86 $O/$T-poster.webp
ffmpeg -v error -y -i $D/still.png -vf "scale=$W:-2:flags=lanczos" -c:v libwebp -quality 86 $O/$T-still.webp
ls -la $O/$T*
