# Sentimental News

Search news, get AI-powered summaries and sentiment analysis.

## Local development

```bash
# 1. Copy env file and fill in your API keys
cp server/.env.example server/.env

# 2. Start everything
docker-compose up -d --build

# 3. Run database migration (first time only)
npm run migrate -w server

# 4. Open http://localhost:5173
```

## Deployment (Vercel)

1. Create a free [Neon](https://neon.tech) PostgreSQL database
2. Import the repo on [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db
GNEWS_KEY=your-gnews-api-key
OPENAI_KEY=sk-your-openai-key
```

The database migration runs automatically during the Vercel build step — no manual steps needed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -w server` | Start server with hot reload |
| `npm run dev -w client` | Start Vite dev server |
| `npm run build -w client` | Build client for production |
| `npm run migrate -w server` | Create/update database tables |
| `npm run test -w server` | Run server tests |
| `npm run test -w client` | Run client tests |
| `npm run lint -w server` | Lint server code |
| `npm run lint -w client` | Lint client code |
