Overview

Build a Next.js application that processes Google Search Console data and generates AI-powered insights using Claude.

Time Limit: 2 hours Submission: GitHub repository link Tools: Use AI coding assistants (Cursor, Claude Code, etc.) - we want to see how you work with AI

The Challenge

You have an arckeywords.csv.zip file (~200 MB) containing Google Search Console data.

Build an application that:

Displays the data in a way users can understand (1 trend chart of your choosing/design)

Filters by date range (user selects start and end dates, then clicks "Apply")

Updates the chart and generates AI insights using Claude API when user clicks "Generate Insights"

Handles the large dataset intelligently (figure out what to send to Claude)

That's it.

We're intentionally leaving the details open. Your architectural decisions are part of the test.

What You'll Be Provided

arckeywords.csv.zip file (~200 MB)

Claude API key (Anthropic): [REDACTED - stored in .env]

This spec

Technical Requirements

Must use:

Next.js

TypeScript

Claude API (Anthropic)

Everything else is your choice:

How you structure the code

How you display the data (table, chart, cards, etc.)

How you build the UI (libraries, frameworks, styling)

How you handle the large file

How you craft prompts to Claude

What insights you ask Claude to generate

What We're Evaluating

Software Engineering (40%) - Code structure, TypeScript usage, organisation

AI Tool Proficiency (30%) - How effectively you use Cursor/Claude Code

LLM Integration (30%) - Prompt quality, handling 200 MB intelligently, API usage

Deliverables

Working Application that meets the requirements above

Git Repository with your code

README.md with setup instructions

Final Interview Discussion

We'll ask you about:

Architecture Decisions - 2-4 key decisions you made and why

Claude Integration Approach - How you handled the 200 MB problem

Trade-offs - What you would improve with more time

Time Breakdown - Rough breakdown of your 2 hours

Any questions please let me know.

Cheers,
