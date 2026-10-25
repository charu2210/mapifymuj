FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/mapifymuj.db
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
VOLUME /app/data
EXPOSE 3000
# Provide JWT_SECRET and ADMIN_PASSWORD at runtime:  docker run -e JWT_SECRET=... -e ADMIN_PASSWORD=... -p 3000:3000 -v mapify-data:/app/data mapifymuj
CMD ["node", "server/index.js"]
