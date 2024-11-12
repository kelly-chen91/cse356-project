from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from scipy.spatial.distance import cosine
from scipy.sparse import csr_matrix
import redis
import json
import os

app = Flask(__name__)

# Connect to Redis
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = int(os.getenv("REDIS_PORT", 6379))
cache = redis.StrictRedis(host=redis_host, port=redis_port, db=0)

# Placeholder: Load interactions data from a database (e.g., MongoDB, PostgreSQL)
def load_interactions_data():
    # Example data; replace this with your database fetch logic
    data = pd.DataFrame({
        'user_id': [1, 2, 1, 3, 2, 3, 4],
        'item_id': [101, 101, 102, 103, 104, 102, 101],
        'interaction': [1, 1, 1, 1, 1, 1, 1]
    })
    return data

# Transform data into user-item matrix
def create_user_item_matrix(data):
    user_item_matrix_df = data.pivot_table(index='user_id', columns='item_id', values='interaction', fill_value=0)
    return csr_matrix(user_item_matrix_df.values), user_item_matrix_df

# Calculate user-user similarity
def calculate_user_similarity(user_item_matrix):
    num_users = user_item_matrix.shape[0]
    similarity_matrix = np.zeros((num_users, num_users))
    for i in range(num_users):
        for j in range(num_users):
            if i != j:
                similarity_matrix[i, j] = 1 - cosine(user_item_matrix[i].toarray(), user_item_matrix[j].toarray())
    return similarity_matrix
# Generate recommendations for a user
def recommend_for_user(user_id, user_item_matrix_df, similarity_matrix, top_n=5):
    user_index = user_item_matrix_df.index.get_loc(user_id)
    similar_users = similarity_matrix[user_index].argsort()[::-1]  # Descending order
    recommendations = {}

    for similar_user_idx in similar_users:
        if similar_user_idx == user_index:
            continue
        for item_idx, interacted in enumerate(user_item_matrix_df.iloc[similar_user_idx]):
            if interacted and not user_item_matrix_df.iloc[user_index, item_idx]:
                recommendations[item_idx] = recommendations.get(item_idx, 0) + similarity_matrix[user_index, similar_user_idx]

    recommended_items = sorted(recommendations, key=recommendations.get, reverse=True)[:top_n]
    return recommended_items

# Endpoint to get recommendations for a user
@app.route('/recommend', methods=['GET'])
def recommend():
    user_id = request.args.get('user_id', type=int)
    top_n = request.args.get('top_n', default=5, type=int)

    # Try to retrieve from cache first
    cache_key = f"recommendations:user:{user_id}"
    cached_recommendations = cache.get(cache_key)
    if cached_recommendations:
        return jsonify(json.loads(cached_recommendations))

    # Load data, create user-item matrix, and calculate similarity matrix
    data = load_interactions_data()
    user_item_matrix, user_item_matrix_df = create_user_item_matrix(data)
    similarity_matrix = calculate_user_similarity(user_item_matrix)

    # Generate recommendations
    recommendations = recommend_for_user(user_id, user_item_matrix_df, similarity_matrix, top_n)

    # Cache the recommendations for future use
    cache.setex(cache_key, 3600, json.dumps(recommendations))  # Cache for 1 hour

    return jsonify(recommendations)

if __name__ == '__main__':
    app.run(debug=True)
