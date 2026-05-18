# SupportWA AI Agent (Hardened MVP)

Clean, safe WhatsApp customer support on OpenWA.

## OpenWA (Choose)
**Local:** `git clone https://github.com/rmyndharis/OpenWA.git && cd OpenWA && npm install && npm run dev` (ports 2886/2785)
**Docker:** `docker compose up -d`

## SupportWA
```bash
git clone https://github.com/er4700345-coder/supportwa-ai-agent.git
cd supportwa-ai-agent
cp .env.example .env
# Set OPENWA_API_URL=http://localhost:2785/api
# AI_API_KEY=sk-... (optional for real LLM)
docker-compose up --build
# or local: npm install && npm run dev
```

## Native Deps (better-sqlite3)
`apk add python3 make g++` or `sudo apt install python3 make g++` before npm install.

## Config
OPENWA_API_URL=http://localhost:2785/api
AI_API_KEY=sk-...          # real OpenAI-compatible
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

## Guards
- Inbound only
- No broadcast
- Size limit + escalation log (no spam)
- Flexible webhook payload

## Smoke/Test
`npm test` (requires running server on 4000)

## Endpoints
/health | /webhooks/openwa | /admin | /api/conversations

Safety: Customer support only.