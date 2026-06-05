# Recall Platform

Next.js App Router frontend for Recall AI, with Supabase authentication and dashboard backend.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local Postgres/Auth)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Start local Supabase (optional):

```bash
npx supabase start
```

Copy the **API URL** and **anon key** from the CLI output into `.env.local`. Apply migrations:

```bash
npx supabase db reset
```

4. Configure Supabase Auth (Dashboard or local):

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`
- Enable **Google** OAuth provider (Client ID + secret)
- For local dev, email confirmations are disabled in `supabase/config.toml` (`enable_confirmations = false`)

5. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth flows

| Route | Behavior |
|-------|----------|
| `/signup` | Email/password + Google OAuth → `/onboarding` |
| `/login` | Email/password + Google → `/dashboard` |
| `/forgot-password` | Sends Supabase reset email |
| `/reset-password` | Updates password after recovery link |
| `/onboarding` | Saves study plan via `POST /api/me/onboarding`, seeds demo topics |
| `/auth/callback` | OAuth / email link session exchange |

Protected routes require a session (see `middleware.ts`).

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/me/onboarding` | POST | Complete onboarding + seed dashboard data |
| `/api/me/dashboard` | GET | Aggregated dashboard payload |
| `/api/ai/questions/extract` | POST | OCR + structure uploaded exam files (multipart) |
| `/api/ai/questions/submit` | POST | Save questions + embed into pgvector |
| `/api/ai/tutor/chat` | POST | RAG tutor (SSE stream) |
| `/api/ai/search` | POST | Semantic search over vectors |
| `/api/ai/cards/generate` | POST | AI flashcard generation |
| `/api/ai/insights/regenerate` | POST | Regenerate dashboard insight |
| `/api/ai/schedule/regenerate` | POST | AI weekly schedule |
| `/api/ai/quiz/generate` | POST | AI quiz from topic context |
| `/api/ai/mock/generate` | POST | Mock exam from question bank RAG |
| `/api/ai/mock/grade` | POST | Grade answer (text or image OCR) |
| `/api/public/papers` | GET | Question bank papers |

## AI stack

- **Primary LLM / vision / OCR**: Gemini 2.5 (`GEMINI_MODEL`, default `gemini-2.5-flash`)
- **Failover LLM**: Groq (`GROQ_MODEL`)
- **Embeddings**: Google Gemini embedding API (`GEMINI_EMBEDDING_MODEL`, 768-dim vectors in Supabase pgvector)
- **Vector store**: `content_documents` + `content_chunks` with `match_content_chunks()` RPC

Set in `.env.local`:

```
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Seed the question bank into Postgres, then backfill vectors:

```bash
npm run seed-papers
npm run embed-papers
```

Optional: seed contributor stats after users exist (`npm run seed-contributors`). Create a Supabase Storage bucket named `question-uploads` for upload file persistence.

## Database schema

Migrations live in `supabase/migrations/`. Core tables: `profiles`, `study_plans`, `topics`, `cards`, `card_scheduling`, `review_events`, `user_insights`. AI tables: `content_documents`, `content_chunks`, `question_submissions`, `submitted_questions`, `tutor_threads`, `tutor_messages`, `ai_usage_logs`, `papers`.

## Production

Set `NEXT_PUBLIC_SITE_URL` to your production origin. Add the same URL and `/auth/callback` to Supabase redirect allowlist. Enable email confirmation if desired.
