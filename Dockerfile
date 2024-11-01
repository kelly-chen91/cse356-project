# Use a stable Node.js image
FROM node:20

# Create a working directory
WORKDIR /src

# Copy package.json and package-lock.json
COPY package*.json ./

# RUN npm install -g npm@latest

# RUN npm config set registry https://registry.npmjs.org/

# Install dependencies
RUN yarn

# Install nodemon globally
RUN yarn global add nodemon 

# Copy the rest of the application code
# COPY ./src ./

# Start the application with nodemon
CMD ["nodemon", "src/app.js"]