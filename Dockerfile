# Use the official Node.js image as a base
FROM node:latest

# Create a working directory
WORKDIR /src

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install nodemon globally
RUN npm install -g nodemon 

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .



# Start the application with nodemon
CMD ["nodemon", "src/app.js"] 