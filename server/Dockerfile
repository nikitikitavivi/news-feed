FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 3001

CMD sh -c "npx tsx src/db/migrate.ts && npx tsx watch src/index.ts"
