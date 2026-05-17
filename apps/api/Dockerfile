FROM node:18-alpine

WORKDIR /app

# Install pg_dump for database backups
RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install

COPY . .

# agent_updates is now mounted via docker-compose volumes

EXPOSE 3000

CMD ["npm", "start"]
