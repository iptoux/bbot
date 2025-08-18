# Use Node.js LTS version as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create a directory for persistent data
RUN mkdir -p /app/data

# Expose the port the app runs on
EXPOSE 4000

# Command to run the application
CMD ["npm", "start"]