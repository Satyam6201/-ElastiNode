FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared ./packages/shared
COPY packages/load-balancer ./packages/load-balancer
RUN npm install --workspace=@elastinode/load-balancer --omit=dev
EXPOSE 8080 8081
ENV NODE_ENV=production
CMD ["node", "packages/load-balancer/src/index.js"]
