# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**任意门 Anywhere Door** — AI-powered travel itinerary planning app.

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **State**: Zustand (pure in-memory, no localStorage)
- **Database**: Supabase PostgreSQL
- **AI**: DeepSeek (default) / Claude (fallback) via Vercel AI SDK
- **Map**: Amap (高德地图)
- **UI**: Tailwind CSS v4 + Ant Design v6 + Framer Motion

Full architecture documentation: `docs/ARCHITECTURE.md`

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm lint
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useHomeFlow.ts` | Core state machine (form → generating → prompt-preview → planning → done) |
| `src/app/page.tsx` | Main page UI |
| `src/app/api/agents/orchestrate-bg/route.ts` | Background parallel agent execution |
| `src/app/api/agents/synthesis-stream/route.ts` | Streaming synthesis (called by frontend) |
| `src/lib/agents/prompts/index.ts` | All 5 agent system prompts |
| `src/lib/agents/types.ts` | Zod schemas (POI, DayPlan, FullItinerary) |
| `src/lib/stores/searchStore.ts` | Form params store |
| `src/lib/stores/agentStore.ts` | Agent real-time state |

## Architecture Notes

- **No localStorage** for app state — all persistence via Supabase `plans` table
- **Device ID** (`lib/deviceId.ts`) stored in localStorage as user identifier
- **Planning params** stored in `plans.planning_params` JSONB for page-refresh recovery
- **Synthesis** runs on frontend (streaming), not in background — detected via `agent_progress.synthesis.status === 'waiting'`
- **enrichedPrompt** uses `[tag]` prefix lines for structured constraints (airport, hotel, POI, times)

## Code Style

- TypeScript strict mode
- Functional components with `memo` for performance-sensitive components
- `useCallback` for stable references passed to memoized children
- Inline styles for dynamic values, Tailwind for static layout
- No `any` types — use proper Zod inference or explicit interfaces
