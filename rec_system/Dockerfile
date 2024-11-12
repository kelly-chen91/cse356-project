# Use an official Python runtime as a base image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt into the container and install dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Expose port 5000 for Flask
EXPOSE 5000

# Define environment variable for Flask
ENV FLASK_APP=app.py

# Run Flask app
CMD ["flask", "run", "--host=0.0.0.0"]
