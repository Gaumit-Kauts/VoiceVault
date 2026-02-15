# Frontend Dockerfile - Node.js serve (no nginx)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including Tailwind)
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Install serve to host the static files
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "3000"]
