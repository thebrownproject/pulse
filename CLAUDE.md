# Arcadian Digital - Tech Challenge

## Context

2-hour timed coding challenge for Junior AI Developer role at Arcadian Digital.
AI tools allowed. Final interview will require explaining the code.

Candidate: Fraser Brown
Date: 2026-02-26
Model: claude-opus-4-6

## Rules

- Read the brief fully before touching code
- Spec locks in at 0:25 -- no scope creep after that
- Every line of code must be explainable in the final interview
- Clean, readable code over clever code
- Leave 15 min at end to review and write README

## Stack Defaults

- Python + FastAPI for backend/API
- TypeScript + Next.js for frontend
- Claude/Anthropic SDK for AI (prefer claude-opus-4-6)
- SQLite for local data

## Reference Projects

Pull these repos in if relevant to the challenge. They contain working patterns to build from.

**stackdocs** (`github.com/thebrownproject/stackdocs`)
- Document extraction pipeline: upload → Mistral OCR → LangChain + Claude Haiku → structured JSON/CSV
- Relevant patterns: Mistral OCR integration, LangChain structured output with Pydantic, OCR result caching, async background tasks, Supabase Storage
- Key decision: Mistral OCR over Tesseract (98.96% accuracy, <5s/doc, $2/1000 pages)
- Stack: FastAPI + Next.js + Supabase + LangChain

**looped-local** (`github.com/thebrownproject/looped-local`)
- Local AI agent with custom inference loop against Ollama models
- Relevant patterns: async generator inference loop, tool registry (bash/file/extensible), SSE streaming, provider abstraction layer, SQLite via Drizzle
- Architecture: engine is Next.js-agnostic pure TypeScript module -- portable pattern
- Stack: Next.js 16 + TypeScript + Ollama + SQLite + Vitest (126 tests)

**space-agents** (`github.com/thebrownproject/space-agents`)
- Agent orchestration framework for Claude Code
- Relevant patterns: multi-agent workflows, Pathfinder/Builder/Inspector crew model, Beads issue tracking

**buildspec** (`github.com/thebrownproject/buildspec`)
- AI-powered NCC compliance assistant for Autodesk Revit
- Shows: domain-specific AI assistant, structured compliance queries

**age-of-agents** (`github.com/thebrownproject/age-of-agents`)
- Turn-based strategy game where two LLM agents compete
- Shows: multi-agent coordination, LLM-as-player pattern

## Code Standards

- Descriptive names, single-responsibility functions
- Comments explain WHY not what
- No unused code, no over-engineering
- Validate inputs, fail fast

## Workflow

Use Space-Agents for planning and execution:
1. `/launch` - start session
2. `/exploration-plan` - spec from brief
3. `/mission` - build
4. `/land` - wrap up

## Submission Checklist

- [ ] Works end-to-end
- [ ] README with architectural decisions
- [ ] Can explain every function
- [ ] Clean, no dead code
- [ ] Edge cases handled
