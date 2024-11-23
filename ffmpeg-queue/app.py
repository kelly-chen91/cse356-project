import redis
import subprocess
import json
import logging
import signal
import sys
from dotenv import load_dotenv
import os 
from pymongo import MongoClient

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load the environment variables from .env
load_dotenv()

# Redis client
redis_client = None

# Mongo client
mongo_client = MongoClient(os.getenv("MONGO_URL"))
print("Connected to MongoDB!")

def processTask(task):
    """Process a single FFmpeg task."""
    videoName = task['videoName']
    videoId = task['videoId']
    
    # FFmpeg commands
    thumbnailCommand = f"""
        ffmpeg -i "videos/{videoName}" -vf "scale=w=iw*min(1280/iw\\,720/ih):h=ih*min(1280/iw\\,720/ih),pad=1280:720:(1280-iw*min(1280/iw\\,720/ih))/2:(720-ih*min(1280/iw\\,720/ih))/2" -c:a copy "padded_videos/{videoId}.mp4" -threads 1 -y
    """
    padCommand = f"""
        ffmpeg -i "padded_videos/{videoId}.mp4" -vf 'scale=w=iw*min(320/iw\\,180/ih):h=ih*min(320/iw\\,180/ih),pad=320:180:(320-iw*min(320/iw\\,180/ih))/2:(180-ih*min(320/iw\\,180/ih))/2' -frames:v 1 "media/{videoId}_thumbnail.jpg" -threads 1 -y
    """
    manifestCommand = f"""
        ffmpeg -hide_banner -loglevel error -i "padded_videos/{videoId}.mp4" \
        -map 0:v -b:v:0 512k -s:v:0 640x360 \
        -map 0:v -b:v:1 768k -s:v:1 960x540 \
        -map 0:v -b:v:2 1024k -s:v:2 1280x720 \
        -f dash -seg_duration 10 -use_template 1 -use_timeline 1 \
        -init_seg_name "{videoId}_chunk_init_\\$RepresentationID\\$.m4s" \
        -media_seg_name "{videoId}_chunk_\\$RepresentationID\\$_\\$Number\\$.m4s" \
        -adaptation_sets "id=0,streams=v" \
        "media/{videoId}_output.mpd" -threads 4
    """
    
    try:
        # # Run FFmpeg commands
        # subprocess.run(thumbnailCommand, shell=True, check=True)
        # logging.info(f"Thumbnail generated for {videoId}")
        
        # subprocess.run(padCommand, shell=True, check=True)
        # logging.info(f"Thumbnail padding completed for {videoId}")
        
        # subprocess.run(manifestCommand, shell=True, check=True)
        # logging.info(f"Manifest created for {videoId}")
        
        # # Update videoId's processing status to complete
        # database = mongo_client.get_database("warmup")
        # videos = database.get_collection("videos")
        # updateStatus = {"status": "complete"}
        # res = videos.update_one({"_id": videoId}, updateStatus)
        # print(f'Successfully updated processing status: {res}')
        
        print(f'Processed Video ID: {videoId}, Video Name: {videoName}')

    except subprocess.CalledProcessError as e:
        # Send failure message
        logging.error(f"Error processing {videoId}: {e.stderr.decode()}")
        # message = {"videoId": videoId, "status": "failed", "error": e.stderr.decode()}
        # send_message_to_queue("processed_tasks", message)

def signal_handler(sig, frame):
    """Handle termination signals for graceful shutdown."""
    logging.info("Shutting down worker...")
    sys.exit(0)

def worker():
    """Redis worker to process tasks."""
    global redis_client
    try:
        redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
        redis_client.ping()
        logging.info("Connected to Redis!")
        
        pubsub = redis_client.pubsub()
        
        pubsub.subscribe('ffmpeg_tasks')
        
        logging.info(pubsub)
        # while True:
        for message in pubsub.listen():
            # task_data = redis_client.blpop("ffmpeg_tasks", timeout=10)
            logging.info(f"message: {message}")
            # if message:
            #     _, task_json = message
            #     task = json.loads(task_json)
            #     logging.info(f"Processing task: {task}")
            #     # processTask(task)
            # else:
            #     logging.info("No tasks in the queue. Waiting...")
    except Exception as ex:
        logging.error(f"Worker error: {ex}")
        sys.exit(1)

if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    worker()
