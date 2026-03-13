# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build applications
RUN npm run build
RUN cd server && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache libc6-compat

# Copy built files and node_modules with compiled native modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/package*.json ./

# Set environment
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

# Volume for data persistence
VOLUME /app/data

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/dist/index.js"]
