# LegalLens — AI Legal Document Assistant

LegalLens is a hackathon-ready full-stack web application for **legal information and document assistance**. It helps a non-lawyer get a clearer first read of a contract or policy by extracting plain-language summaries, important clauses, obligations, dates, attention areas, document-grounded answers, comparison changes, and questions to take to a qualified legal professional.

> **Legal boundary:** LegalLens does not provide professional legal advice and is not a substitute for a qualified legal professional. The interface repeats this boundary at the top of every workspace.

## Technology stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4 with a custom editorial design system
- Express + tRPC 11 for typed server procedures
- Built-in Manus Forge LLM proxy through `server/_core/llm.ts`
- `pdf-parse` for PDF extraction and `mammoth` for DOCX extraction
- In-memory session workspace for the zero-setup hackathon demo
- Vitest for deterministic server and security tests
- Manus WebDev full-stack scaffold with optional Manus OAuth, database, and storage capabilities available for future persistence

## Implemented workflow

1. Open the Overview workspace and understand the product immediately.
2. Load the seeded Northstar contractor agreement or upload a PDF, DOCX, or TXT document.
3. Review the executive summary, parties, financial terms, termination language, important clauses, and attention areas.
4. Ask a document-grounded question and receive an answer, relevant section, why it matters, and what to review next.
5. Compare the seeded agreement with a generated revision or upload a second version.
6. Inspect changed clauses, dates, payment terms, obligations, and review priority.
7. Mark extracted obligations complete in the interactive checklist.
8. Use generated lawyer questions to prepare for professional review.

## AI architecture

AI calls run only inside server-side tRPC procedures. The document is explicitly placed in an untrusted-data section, separate from system instructions and the user request. Prompt-injection content inside uploaded files is treated as content, not commands. Structured JSON schemas are used for summaries, Q&A, and comparisons; responses are validated with Zod. If the LLM proxy is unavailable, a deterministic local heuristic fallback keeps the demo usable while clearly lowering confidence.

The server uses `gpt-5-mini` from the live Manus model catalog. Credentials come from the platform-provided `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` variables and are never included in client code.

## Security and privacy measures

- Server-side API key handling only
- PDF, DOCX, and TXT allowlist
- 10 MB file limit, empty-file rejection, safe filename normalization
- Base64 payload validation and tRPC input schemas
- Text cleanup and control-character removal
- Rate limit of 12 analysis requests per minute per requester key
- No dynamic HTML rendering of document text
- Safe error messages without stack traces or secret values
- Path separators stripped from names to prevent traversal through storage keys
- Uploaded content is bounded before it reaches the model context
- In-memory session storage keeps the demo ephemeral; no document bytes are persisted by default
- Explicit uncertainty and legal-information disclaimer throughout the UI

## Performance and accessibility

The server extracts and truncates text before AI calls, sends relevant keyword-matched excerpts for questions, caps prompt context, and uses structured output to avoid repeated parsing. The client uses one dashboard shell, local checklist state, compact preview data, loading/error states, and no unnecessary network requests.

The UI uses semantic headings, labels, keyboard-reachable upload zones, visible focus rings, high-contrast text, `aria-live` for processing and answers, `prefers-reduced-motion`, responsive breakpoints, and a mobile navigation drawer.

## Tests and validation

Verified locally:

- `pnpm check` — TypeScript passes
- `pnpm test -- --run` — 2 test files, 5 tests passing
- `pnpm build` — Vite client build and server bundle pass
- PDF upload smoke test — extracts text and returns analysis
- DOCX upload smoke test — extracts text and returns analysis
- tRPC demo query smoke test — returns seeded workspace document
- Desktop preview screenshot — dashboard renders as intended
- Mobile preview screenshot at 375×812 — responsive layout renders as intended

## Run locally

```bash
pnpm install
pnpm dev
```

The WebDev scaffold provides the development environment variables automatically. For a manual deployment outside Manus, configure the equivalent server-side values:

```bash
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your_server_side_key
DATABASE_URL=optional_database_url
JWT_SECRET=optional_session_secret
```

## Build and start

```bash
pnpm check
pnpm test -- --run
pnpm build
pnpm start
```

## Deployment

Use the Manus WebDev preview and publish flow for the initialized project. Create a checkpoint after final verification, then publish from the WebDev project controls. The app is designed for the managed single-process runtime and does not rely on background workers.

## Project map

```text
client/src/pages/Home.tsx     Main accessible LegalLens workspace
client/src/index.css          Editorial responsive design system
server/legal.ts               Parsing, heuristics, AI prompts, schemas, session store
server/routers.ts             Typed legal upload, demo, Q&A, and comparison procedures
server/legal.test.ts          Unit and security tests
shared/legal.ts               Shared client/server result types
```
