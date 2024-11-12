from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from scipy.spatial.distance import cosine
from scipy.sparse import csr_matrix

app = Flask(__name__)

# Endpoint to get recommendations for a user
@app.route('/recommend', methods=['GET'])
def recommend():
    user_id = request.args.get('user_id', type=int)
    top_n = request.args.get('top_n', default=5, type=int)
    
    # Step 1: Load the latest user-item matrix (or generate it if necessary)
    user_item_matrix = load_user_item_matrix()  # Load this from a pre-generated matrix or database
    
    # Step 2: Calculate similarity and get recommendations
    recommendations = recommend_for_user(user_id, user_item_matrix, top_n)
    
    return jsonify(recommendations)

def load_user_item_matrix():
    # Placeholder: Load matrix from a database or file, for example
    # Simulate with an example DataFrame
    data = pd.DataFrame({
        'user_id': [1, 2, 1, 3, 2, 3, 4],
        'item_id': [101, 101, 102, 103, 104, 102, 101],
        'interaction': [1, 1, 1, 1, 1, 1, 1]
    })
    user_item_matrix = data.pivot_table(index='user_id', columns='item_id', values='interaction', fill_value=0)
    return csr_matrix(user_item_matrix.values)

def recommend_for_user(user_index, user_item_matrix, top_n=5):
    # Placeholder for similarity calculation
    # Implement user-user or item-item recommendation here as before
    # Return a list of recommended item IDs for simplicity
    return [101, 102, 103]  # Example output

if __name__ == '__main__':
    app.run(debug=True)
