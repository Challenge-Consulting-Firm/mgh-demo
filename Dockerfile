FROM node:20-alpine

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed || true; npm run dev -- -H 0.0.0.0"]
