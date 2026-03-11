# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, and Claude generates/edits files in a virtual file system with real-time preview rendering.

## Commands

- `npm run setup` — Install dependencies, generate Prisma client, run migrations
- `npm run dev` — Start dev server (Next.js with Turbopack, port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm test` — Run all tests (vitest)
- `npx vitest run src/path/to/test.test.ts` — Run a single test file
- `npm run db:reset` — Reset the SQLite database

## Architecture

### AI Chat Flow

1. User sends message via chat UI → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat`
2. API route (`src/app/api/chat/route.ts`) uses Vercel AI SDK's `streamText` with two tools:
   - `str_replace_editor` — create/edit/insert in virtual files (Claude's SWE-bench style tool)
   - `file_manager` — rename/delete files
3. Tool calls stream back to the client where `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) applies them to the in-memory `VirtualFileSystem`
4. Preview updates live via `PreviewFrame` which builds an import map from virtual files

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is the core abstraction — an in-memory file tree used on both server (for tool execution) and client (for UI state). Files are never written to disk. It serializes to/from plain objects for transport between client and server via the chat API body.

### Preview Pipeline

`src/lib/transform/jsx-transformer.ts` handles the preview rendering pipeline:
- Transforms JSX/TSX files using `@babel/standalone`
- Creates blob URLs for each transformed file
- Builds an import map resolving local files, `@/` aliases, and third-party packages (via esm.sh)
- Generates a self-contained HTML document with React loaded from CDN

### Provider / Mock Mode

`src/lib/provider.ts` — When `ANTHROPIC_API_KEY` is not set, a `MockLanguageModel` returns static component code so the app runs without an API key. The mock uses the same Vercel AI SDK LanguageModelV1 interface.

### Data Model

Prisma with SQLite (`prisma/schema.prisma`). Two models: `User` (email/password auth via jose JWTs) and `Project` (stores serialized messages and file system data). Prisma client outputs to `src/generated/prisma`.

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

### Layout

- `src/app/page.tsx` — Anonymous users see MainContent directly; authenticated users redirect to their latest project
- `src/app/[projectId]/page.tsx` — Project page for authenticated users
- `src/app/main-content.tsx` — Main UI layout: resizable left panel (chat) + right panel (preview/code tabs)
- `src/components/chat/` — Chat interface components (MessageList, MessageInput, MarkdownRenderer)
- `src/components/editor/` — Code view (FileTree, CodeEditor using Monaco)
- `src/components/preview/` — Live preview iframe
- `src/components/auth/` — Sign in/up forms and dialog
- `src/lib/prompts/generation.tsx` — System prompt for the AI

## Code Style

- Use comments sparingly — only comment complex code where the logic isn't self-evident

## Key Conventions

- Uses `@/` path alias (maps to `src/`)
- UI primitives from shadcn/ui in `src/components/ui/`
- Tailwind CSS v4 (PostCSS-based config, no `tailwind.config.js`)
- Server actions in `src/actions/`
- Tests use vitest + @testing-library/react with jsdom environment, colocated in `__tests__/` directories
- `node-compat.cjs` is required at startup via NODE_OPTIONS for Node.js compatibility shims
