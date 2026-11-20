FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared ./packages/shared
COPY packages/backend-server ./packages/backend-server
RUN npm install --workspace=@elastinode/backend-server --omit=dev
EXPOSE 4001
ENV NODE_ENV=production
CMD ["node", "packages/backend-server/src/index.js"]
