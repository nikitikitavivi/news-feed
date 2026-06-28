# Sentimental News

## Link
https://news-feed-pi-ochre.vercel.app/

A small full-stack app that searches the news, then uses an LLM to summarize each
article and classify its sentiment (positive / neutral / negative). Search or browse
trending headlines, pick a **language** and **country** for relevance, and hit
**Analyze** to get an AI summary. Every analysis is saved to a shared history.

## Stack

- **Frontend** — React 18 + Vite, TypeScript. No UI framework; the app is small enough not to need one.
- **Backend** — Node + Express, TypeScript, Zod for validation.
- **Data** — PostgreSQL (Neon in the cloud) via Drizzle ORM.
- **External APIs** — GNews (articles) + OpenAI (summary & sentiment).
- **Tooling** — npm-workspaces monorepo, Vitest, ESLint + Prettier, Docker Compose, Vercel.

## Architecture

```
news-feed/
├── client/            # React + Vite SPA
├── server/            # Express API — routes, services, db, store
├── api/               # Vercel serverless entry (wraps the Express app)
├── docker-compose.yml
└── vercel.json
```

One repository, two workspaces (`client`, `server`), plus a thin `api/` adapter.

## Trade-offs (deliberate)

Cuts made to fit the time-box, with the production answer noted:

- **No authentication.** Everyone is treated as the same user and shares one global
  history. Skipped on purpose to spend the time on the core flow.
- **Concurrency control stops at the DB constraint.** That constraint is the correctness
  boundary and is enough here. Coalescing duplicate *in-flight* model calls across
  instances (so two simultaneous first-time requests don't both hit OpenAI) would need a
  shared store such as **Redis** — out of scope for this assignment.
- **Trending isn't cached.** It's the default view and many users request the same thing,
  so the obvious next step is caching trending results keyed by `country + language`
  (again, Redis).
- **Text lives in Postgres.** Fine for short summaries and snippets. If full article
  bodies were ever stored at scale, large text doesn't belong in table rows — keep
  metadata + a reference in Postgres and push the blobs to object storage (e.g. S3).
  Overkill for this project, but worth noting.
- **Schema bootstrap is a simple idempotent script** (`npm run migrate`, `CREATE TABLE
  IF NOT EXISTS`) rather than a full migration tool. `drizzle-kit` is wired in if
  versioned migrations were needed.

## Key decisions

**Analyses are cached.** The first request to analyze an article calls OpenAI and
persists the article + result in Postgres. Every later request for the same URL returns
the stored analysis (HTTP `200`) and never calls the model again — saving cost and latency.

**Concurrency is handled at the database.** Trending headlines get analyzed by many
people at once, so duplicate concurrent requests are made safe with a unique constraint
(one analysis per article) plus `INSERT ... ON CONFLICT DO NOTHING` and a read-back.
Simultaneous requests converge on a single stored row — one returns `201`, the rest
`200` — with no duplicate rows and no errors, and it holds **across serverless
instances**, not just within one process.

**Language & country.** Both are selected in the UI and passed to GNews
(more relevant results) and to OpenAI (summaries written in the chosen language, with
local context). Since GNews exposes top-headlines, a **Trending** category was added and
is the default view on load.

**OpenAI output can't break parsing.** The model is pinned to a strict JSON schema
(structured outputs), so the response shape is guaranteed; it's then validated again with
Zod before use.

**Prompts are static-first, dynamic-last.** A fixed base prompt is assembled once, and
only the variable instructions (target language, country context) are appended when
relevant - good for LLM KV caching. 
