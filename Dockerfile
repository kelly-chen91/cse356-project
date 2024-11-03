# Use a stable Node.js image
FROM node:20

# Create a working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN yarn install

# Install nodemon globally
RUN yarn global add nodemon 

# Start the application with nodemon
CMD ["nodemon", "./src/app.js"]