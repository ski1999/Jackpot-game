
# Deployment Instructions

If the `Dockerfile` or `.dockerignore` files are missing from your file tree, please create them manually using the content below.

## 1. Dockerfile

Create a file named `Dockerfile` in the root directory and paste this content:

```dockerfile
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

## 2. .dockerignore

Create a file named `.dockerignore` in the root directory and paste this content:

```text
node_modules
dist
.git
.DS_Store
```

## 3. Deployment

Once these files are created, you can deploy using:

```bash
# Build the image
docker build -t fazbear-slots .

# Run the container (Local Test)
docker run -p 8080:8080 fazbear-slots
```

### Database Configuration (Production)

To enable persistence, set the following environment variables when running the container:

```bash
docker run -p 8080:8080 \
  -e USE_REDIS=true \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e USE_POSTGRES=true \
  -e DATABASE_URL=postgres://user:pass@host:5432/dbname \
  fazbear-slots
```

Ensure you run the contents of `backend/schema.sql` on your PostgreSQL database to create the required tables.
