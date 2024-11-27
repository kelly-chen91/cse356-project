import pandas as pd 
import numpy as np
from pymongo import MongoClient 
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import os
import logging
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
load_dotenv()

# Connect to Mongodb 
client = MongoClient(os.getenv("MONGO_URL"))
logging.info(f'Successfully connected to Mongodb!')

database = client.get_database("warmup")
feedbackCollection = database.get_collection("feedbacks")
userCollection = database.get_collection("users")
videoCollection = database.get_collection("videos")

def generateUserVideoMatrix():
    feedbackData = list(feedbackCollection.find({}, {"userId": 1, "videoId": 1, "value": 1, "_id":0}))

    logging.info(f'Feedback Data \n {feedbackData}')

    df = pd.DataFrame(feedbackData)
    df['value'] = df['value'].astype("int8")

    # Fills the matrix of User, Video, Value
    userVidMatrix = df.pivot_table(index="userId", columns="videoId", values="value", fill_value=0)

    return userVidMatrix
# Calculate Similarity for Users by default
def calculateSimilarity(userVidMatrix, isUserBased=True):
    
    if isUserBased:
        userSimilarity = cosine_similarity(userVidMatrix)
        userSimilarityDf = pd.DataFrame(userSimilarity, index=userVidMatrix.index, columns=userVidMatrix.index)
        logging.info(f'User Similarity:\n {userSimilarityDf}')
        return userSimilarityDf
    else:
        videoSimilarity = cosine_similarity(userVidMatrix.T)
        videoSimilarityDf = pd.DataFrame(videoSimilarity, index=userVidMatrix.columns, columns=userVidMatrix.columns)
        logging.info(f'Video Similarity:\n {videoSimilarityDf}')
        return videoSimilarityDf

def findSimilarUsers(userId, userSimilarityDf):
    # user = userCollection.findOne({"_id": ObjectId(userId)})
    similarUsers  = userSimilarityDf[userId].sort_values(ascending=False)
    logging.info(f"Similar Users to user {userId}: \n {similarUsers}")
    return similarUsers

def findSimilarVideos(videoId, videoSimilarityDf):
    similarVideos = videoSimilarityDf[videoId].sort_values(ascending=False)
    logging.info(f"Similar Videos to video {videoId}: \n {similarVideos}")
    return similarVideos

def similarVideosByUser(userId, userVidMatrix, similarUsers, recommendCount):
    watchedVideos = userVidMatrix.loc[userId]
    recommendations = {}
    count = 0

    for similarUser in similarUsers.index[1:]:  # Skips target user
        logging.info(f"Similar User: {similarUser}")
        videos = userVidMatrix.loc[similarUser]
        for video, value in videos.items():
            if watchedVideos[video] == 0 and value > 0:   # Excludes already watched or disliked
                recommendations[video] = recommendations.get(video,0) + (similarUsers[similarUser] * value)
                if len(recommendations) >= recommendCount: 
                    break
        if len(recommendations) >= recommendCount:
            break
    # Sort by recommendation score
    sortedRecommendations = sorted(recommendations.items(), key = lambda x: -x[1])
    logging.info(f"Sorted Recommended Videos \n {sortedRecommendations}")
    return sortedRecommendations

def similarVideosByVideos(videoId, userVidMatrix, similarVideos, recommendCount):
    # for similarVideo in similarVideos.index[1:]:  # Skips target video
    return None  

    
if __name__ == "__main__":
    # client = MongoClient(os.getenv("MONGO_URL"))
    # logging.info(f'Successfully connected to Mongodb!')
    userId = "6746bec2393a76f24c664c6b"
    userVidMatrix = generateUserVideoMatrix()
    userSimilarityDf = calculateSimilarity(userVidMatrix)
    similarUsers = findSimilarUsers(userId, userSimilarityDf)
    sortedRecommendations = similarVideosByUser(userId, userVidMatrix, similarUsers, 10)
    calculateSimilarity(userVidMatrix,isUserBased=False)



    



