FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN DATABASE_URL=mongodb://placeholder/chemu npx prisma generate
EXPOSE 3000
CMD ["node", "src/index.js"]
