FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared ./packages/shared
COPY packages/autoscaler ./packages/autoscaler
COPY packages/dashboard/dist ./packages/dashboard/dist
RUN npm install --workspace=@elastinode/autoscaler --omit=dev
EXPOSE 9000
ENV NODE_ENV=production
CMD ["node", "packages/autoscaler/src/index.js"]
