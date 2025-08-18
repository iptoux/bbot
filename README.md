# BBot Server — Discord Bot with LLM, Memory (RAG) and Quiz

A Discord bot that connects to OpenAI or a local LM Studio server, streams answers in chat, remembers user facts/preferences (RAG), supports image prompts, exposes a tiny REST API, and ships with a configurable multiple‑choice Quiz game.

Note: This README was fully reworked on 2025‑08‑14 for clarity and step‑by‑step onboarding.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration (env.local)](#configuration-envlocal)
  - [OpenAI vs. LM Studio](#openai-vs-lm-studio)
  - [Quiz settings](#quiz-settings)
- [Run](#run)
  - [Node.js](#nodejs)
  - [Docker / Docker Compose](#docker--docker-compose)
- [Bot Commands](#bot-commands)
  - !cmd
  - !llm (text + images)
  - !memory view / !memory delete / !confirm-delete
  - !fact add
  - !preference set
  - [Quiz: !quiz / !toplist](#quiz-commands)
- [User Memory (RAG)](#user-memory-rag)
- [Image Processing (Vision)](#image-processing-vision)
- [REST API Endpoints](#rest-api-endpoints)
- [Data & Persistence](#data--persistence)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

## Overview

The bot listens in Discord channels and responds to commands. You can use:
- OpenAI API, or
- a local LM Studio server

to generate responses. The bot can remember users (facts, preferences, recent interactions), handle multimodal requests (images), and run a simple Quiz game with points and a toplist.

## Features

- Discord message handling (discord.js v14)
- LLM backends: OpenAI API or local LM Studio
- Streaming replies edited in place, with safe chunking (<= 2000 chars)
- User memory (RAG): facts, preferences, recent interactions per user
- Optional LLM‑based extraction of new user facts from conversations
- Multimodal: analyze up to 5 attached images per !llm prompt
- Small REST API (send message, manage notifications)
- Quiz game: timed multiple‑choice questions with cooldown and toplist
- Dockerfile and docker‑compose for containerized deployment

## Prerequisites

- Node.js 18+ recommended (works with modern LTS)
- A Discord Bot token (create in the Discord Developer Portal; invite with the needed intents/permissions)
- Either:
  - OpenAI API key, or
  - LM Studio installed and its Local Server running

## Quick Start

1. Clone the repo and install dependencies:
   npm install
2. Create env.local in the project root (see Configuration).
3. Start the bot:
   node bot.js
4. In your Discord server, try:
   !cmd
   to see commands, and
   !quiz 3
   to start a short 3-question quiz.

## Installation

- Clone: git clone <your-fork-or-repo-url>
- Install dependencies: npm install
- Check package.json: there’s no start script; run with node bot.js

## Configuration (env.local)

Create a file env.local in the project root. Example minimal template:
```bash
DISCORD_BOT_TOKEN=your_discord_bot_token
BOT_PORT=4000
```

# Choose one backend:
### OpenAI
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=openai/gpt-oss-20b
```

### or LM Studio
```bash
LM_STUDIO_API_URL=http://localhost:1234/v1
OPENAI_MODEL=gemma-3-12b-it
```

# Memory extraction via LLM (optional)
```bash
FACTS_VIA_LLM=true
```

# Assistant behavior
```bash
ASSISTANT_ROLE=You are a helpful assistant.
SYSTEM_PROMPT=Provide direct responses without showing your thinking process.
```

Variables explained:
- DISCORD_BOT_TOKEN: Your Discord bot token.
- BOT_PORT: Port for the Express server (default 4000).
- OPENAI_API_KEY: Required when using OpenAI.
- OPENAI_MODEL: Model identifier (default openai/gpt-oss-20b). When using LM Studio, if your model name starts with openai/, the prefix is removed automatically.
- LM_STUDIO_API_URL: e.g., http://localhost:1234/v1 if you run LM Studio locally.
- FACTS_VIA_LLM: true to ask the LLM to extract persistent user facts; otherwise regex fallback.
- ASSISTANT_ROLE: Persona for the assistant.
- SYSTEM_PROMPT: System instruction for the LLM. The code also sanitizes replies to avoid exposing hidden thinking or image URLs.

### OpenAI vs. LM Studio

OpenAI:
- Set OPENAI_API_KEY
- Optionally set OPENAI_MODEL
- Do not set LM_STUDIO_API_URL

LM Studio:
- Install LM Studio, download a model, start Local Server
- Set LM_STUDIO_API_URL (e.g., http://localhost:1234/v1)
- Set OPENAI_MODEL to your model name (OPENAI_API_KEY can be any non-empty value but is not used)

### Quiz settings

Two environment variables control the Quiz behavior:
- QUIZ_ANSWER_SECONDS: Time limit per question (seconds). Minimum 5. Default 20. Used to set the per-question timer displayed to players.
- QUIZ_COOLDOWN_MINUTES: Cooldown before a user can start a new quiz (minutes). Minimum 1. Default 60. Enforced per user (across channels), with remaining time and next allowed time shown on attempt.

Where to configure:
- Add them to env.local (see template above). The bot reads env.local on startup.
- The bot logs the effective values (after applying minimums) at startup for visibility.

Example env.local additions:
```bash
QUIZ_ANSWER_SECONDS=30
QUIZ_COOLDOWN_MINUTES=60
```

# Run

### Node.js

- Start: 
```bash
node bot.js
```
The bot logs key environment configuration at startup for diagnostics.

### Docker / Docker Compose

Prerequisites:
- Docker
- Docker Compose

Steps:
1. Ensure you created env.local as above.
2. Start containers:
   docker-compose up -d
3. View logs:
   docker-compose logs -f
4. Stop:
   docker-compose down

Persistent volumes (docker-compose.yml):
```bash
./env.local -> /app/env.local
./user-memory.json -> /app/user-memory.json
./data -> /app/data
```
## Bot Commands

!cmd
- Lists all available commands.

!llm <message>
- Sends a prompt to the configured LLM backend and streams the reply.
- You can attach up to 5 images (PNG, JPG/JPEG, GIF, WEBP, BMP, TIFF) for visual analysis.
- Image prompts intentionally ignore user memory to avoid biasing visual descriptions.

Examples:
- !llm Tell me a joke about programming
- Attach a photo, then: !llm What is shown in this image?

!memory view
- DMs you all stored info about you: basics, facts, preferences, recent interactions.

!memory delete + !confirm-delete
- Requests deletion of your stored data and requires a confirmation within 30 seconds via !confirm-delete.

!fact add <fact>
- Adds a persistent fact about you.
- Examples: !fact add I speak German; !fact add I prefer dark mode

!preference set <key> <value>
- Sets a preference (key/value) that can influence responses.
- Examples: !preference set language German; !preference set responseStyle concise

### Quiz commands

!quiz [count]
- Starts a quiz in the current channel (1–5 questions; default 5). Only one active quiz per channel.
- Everyone can answer by sending just the letter A–F (no replies/quotes). Only your first valid answer per question counts.
- The bot reacts with ✅ when your answer is registered.
- Each correct answer gives 1 point. If you answer all questions correctly in a session, you receive +2 bonus points.
- The per-question time limit is shown and controlled by QUIZ_ANSWER_SECONDS.
- A user can only start a new quiz after QUIZ_COOLDOWN_MINUTES have passed; otherwise the bot shows the remaining wait time and when it’s allowed again.
- If a question JSON contains a category, it is displayed as [Category: ...].

!toplist
- Shows the top users by total quiz points (server‑wide).
- Persistence: Quiz points are stored per user in user-memory.json (quizPoints). To reset points, stop the bot and edit or delete the relevant entries (or the file) before restarting.

Question catalog (quiz-questions.json):
- File location: quiz-questions.json at project root.
- Structure example:
```JSON
{
  "category": "Programming",
  "question": "Which array method filters elements?",
  "choices": ["map", "forEach", "filter", "reduce"],
  "answerIndex": 2
}
```
- Up to 5 questions are asked per quiz (or fewer if you use !quiz 3).
- Supported options: A–F (max 6 choices).
- Ensure answerIndex is within choices range.

### Jokes command

!joke <type>
- Tells a joke of the given type. Types are loaded from jokes.json.
- Use !joke list (or !joke help) to see all available types.
- You can also use !joke random to get a random type.

Jokes catalog (jokes.json):
- File location: jokes.json at project root.
- Structure: an object mapping type names to arrays of joke strings.
- Example snippet:
```JSON
{
  "php": [
    "PHP – der Code, den du 2005 geschrieben hast, läuft immer noch.",
    "In PHP gibt’s 100 Wege, etwas zu tun – und mindestens 90 davon sind falsch."
  ],
  "css": [
    "CSS – wo ein fehlendes Semikolon ganze Welten zerstört."
  ]
}
```
- To add or edit jokes, modify jokes.json and restart the bot.
- Automatic joke responses to keywords in normal chat have been disabled; use the !joke command instead.

### Server activity statistics

!stats [N]
- Shows a toplist of the most active users and channels by number of messages in this server (guild‑only). Default N=10, min 3, max 25.
- You can exclude specific channels from the toplists by setting STATS_EXCLUDE_CHANNELS in env.local. This accepts channel IDs, <#ID> mentions, or names (case‑insensitive, suffix match). Example:
  STATS_EXCLUDE_CHANNELS=┣〢dev-spam,dev-spam,<#123456789012345678>

!stats reset
- Admin/Mods only (requires one of: Administrator, Manage Guild, Manage Channels, or Manage Messages).
- Resets message‑based activity statistics for this server by deleting stored message events for the guild.
- Command and joke counters are not affected.

## User Memory (RAG)

- Stores: username, recent interactions, user facts, preferences.
- Retrieval: !llm prompts are augmented with the user’s stored context (except for image analysis, where context is intentionally omitted).
- Fact extraction:
  - If FACTS_VIA_LLM=true, the bot asks the LLM to output ONLY a JSON array (max 5) of short, stable, verifiable user facts.
  - If LLM extraction is disabled/fails, falls back to pattern matching (e.g., “I live in Berlin”).
- Deduplication: New facts are deduped before saving to user-memory.json.
- Limits: Recent interactions are bounded (last 10) to prevent growth.
- Privacy: Users can view/delete their data with !memory commands.

## Image Processing (Vision)

- Supports up to 5 images per !llm prompt.
- OpenAI backend: image URLs are passed as image_url parts.
- LM Studio backend: images are downloaded and sent as base64 data URLs when required by the model.
- Guardrails: ~10 MB per image; failed/oversized images are skipped; if all fail, the bot falls back to text-only and informs the model.
- Sanitization: Replies are cleaned to avoid leaking image URLs/markdown.

## REST API Endpoints

- POST /notify/add — Add a user to a notification list
- POST /notify/remove — Remove a user from the notification list
- POST /send — Send a message to a specific channel

Example (PowerShell curl):
  curl -X POST http://localhost:4000/send -H "Content-Type: application/json" -d '{"channelId":"<CHANNEL_ID>","message":"Hello from API"}'

## Data & Persistence

- user-memory.json: stores long-term user data (facts, preferences, history)
- data directory: available for additional persistence (mounted in Docker)
- env.local: environment configuration (never commit secrets)

## Troubleshooting

General:
- Verify env.local values and that the bot has required Discord permissions/intents.
- Watch the console logs for errors on startup and when issuing commands.

OpenAI:
- Ensure a valid API key and correct model name; check account quota/credits.

LM Studio:
- Confirm Local Server is running and LM_STUDIO_API_URL matches.
- Ensure a model is loaded; try smaller models if timeouts occur.
- If your OPENAI_MODEL starts with openai/, the prefix is automatically removed for LM Studio.

User facts:
- FACTS_VIA_LLM must be true to enable LLM extraction, otherwise regex fallback.
- No new facts may simply mean there weren’t stable facts to add.
- Ensure user-memory.json is writable by the bot process.

Quiz:
- “My answer wasn’t counted”: send only A–F (no extra text) within the time limit; look for the ✅ reaction.
- “A quiz is already running”: only one quiz per channel at a time.
- “I cannot start a quiz”: cooldown active; wait until the displayed time.
- “No category shown”: question lacks category in the JSON.

## FAQ

- Which Node.js version? Node 18+ recommended.
- How do I change the bot’s persona? Edit ASSISTANT_ROLE and SYSTEM_PROMPT in env.local.
- Does image analysis include my memory? No; to avoid bias, image prompts exclude memory.
- Where are my data stored? In user-memory.json next to the bot, and in Docker volumes if used.

## License

ISC (see package.json).



## Bot Control & Stats API (New)

This project now includes a modular API server alongside the Discord bot.

- Start (new modular entrypoint):
  - npm start
  - which runs: node src/index.js
  - Legacy: node bot.js still works, but new control/stats endpoints live under src/.
- Security: All /bot and /stats endpoints require the X-API-Key header.

Environment variables (supported names):
- API_KEY: required to access the API.
- PORT or BOT_PORT: API port (default 3000 if neither is set).
- DISCORD_TOKEN or DISCORD_BOT_TOKEN: Discord bot token.
- RESTART_MODE: soft | hard (default soft). hard calls process.exit(0) and requires a process manager (PM2/NSSM) to restart.
- COUNT_WHEN_DISABLED: true | false (default true) – if false, messages are not counted while the bot is disabled.
- STATS_EXCLUDE_CHANNELS: comma-separated list of channel IDs, <#ID> mentions, or names to exclude from in-chat !stats toplists (e.g., STATS_EXCLUDE_CHANNELS=┣〢dev-spam,dev-spam,<#123456789012345678>).
- STATS_BACKEND: json (default). sqlite is not implemented in this minimal setup.
- DATA_DIR: directory for persistent files (default ./data).

Endpoints (all JSON; send X-API-Key header):
- GET /bot/status → { enabled, loggedIn, uptimeMs, version, guilds, users }
- POST /bot/enable → { enabled: true }
- POST /bot/disable → { enabled: false }
- POST /bot/restart { "mode": "soft"|"hard" } → 202 { ok: true, mode }
- GET /stats → overview totals + top lists
- GET /stats/messages?from=ISO&to=ISO&channelId=...&userId=...
- GET /stats/users?top=10
- GET /stats/jokes?top=10
- GET /stats/commands?top=20

PowerShell curl examples (assuming PORT=3000):

# Status
curl -s http://localhost:3000/bot/status -H "X-API-Key: $env:API_KEY" | jq

# Enable / Disable
curl -s -X POST http://localhost:3000/bot/enable -H "X-API-Key: $env:API_KEY" | jq
curl -s -X POST http://localhost:3000/bot/disable -H "X-API-Key: $env:API_KEY" | jq

# Restart (soft)
curl -s -X POST http://localhost:3000/bot/restart -H "Content-Type: application/json" -H "X-API-Key: $env:API_KEY" -d '{"mode":"soft"}' | jq

# Stats overview
curl -s http://localhost:3000/stats -H "X-API-Key: $env:API_KEY" | jq

# Stats messages by window / filters
curl -s "http://localhost:3000/stats/messages?from=2025-08-01&to=2025-08-18&channelId=123" -H "X-API-Key: $env:API_KEY" | jq

Notes:
- In disabled mode, the bot ignores command processing. Message counting can be kept on/off via COUNT_WHEN_DISABLED.
- Hard restarts only make sense if a supervisor restarts the process.
