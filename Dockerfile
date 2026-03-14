# Build stage
FROM node:18-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --only=production=false
RUN cd server && npm ci --only=production=false

COPY . .

RUN npm run build
RUN cd server && npm run build

RUN npm prune --production
RUN cd server && npm prune --production

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/package*.json ./

RUN rm -rf /var/cache/apk/* /tmp/*

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

VOLUME /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
