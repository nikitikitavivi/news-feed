FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY tsconfig.json tsconfig.node.json* vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
