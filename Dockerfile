# Stage 1: Build the Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the frontend (Vite) -> outputs to /app/dist
RUN npm run build

# Stage 2: Setup the Runtime
FROM node:20-alpine

WORKDIR /app

# Install dependencies required for production runtime
COPY package.json package-lock.json* ./
RUN npm install

# Copy the built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the backend source code and shared types
# We need these because we are running with ts-node
COPY backend ./backend
COPY types.ts ./
COPY config.ts ./
COPY audio.ts ./
COPY constants.ts ./
COPY tsconfig.json ./

# Expose the port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
```
