# SupportWA

**Production WhatsApp AI Customer Support Agent on OpenWA.**

Customer conversations only. No spam. No mass messaging.

## Architecture
Customer WhatsApp → OpenWA webhook → SupportWA (Express) → AI provider (OpenAI-compatible or stub) → OpenWA send → Customer

## OpenWA Setup
**Local:** git clone https://github.com/rmyndharis/OpenWA.git && cd OpenWA && npm install && npm run dev
Dashboard: http://localhost:2886 | API: http://localhost:2785/api
**Docker:** docker compose up -d (same ports)

## SupportWA Setup
**Local:** git clone https://github.com/er4700345-coder/supportwa-ai-agent.git && cd supportwa-ai-agent && cp .env.example .env && npm install && npm run dev
**Docker:** docker-compose up --build

## Environment Variables
OPENWA_API_URL=http://localhost:2785/api
AI_API_KEY=sk-... (optional for real LLM)
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:./supportwa.db

## API Endpoints
GET /health | GET /metrics | POST /webhooks/openwa | GET /admin | GET /api/conversations | PATCH /api/conversations/:id/status

## Admin Dashboard
http://localhost:4000/admin (view conversations, escalate/resolve)

## Safety & Consent
- Inbound customer support only
- Per-contact rate limiting
- Escalation to human with logs
- No auto-broadcast
- WhatsApp automation consent required per platform policy

## Limitations
- In-memory rate/metrics (restart resets)
- Stub AI without key
- Basic admin UI
- No persistent conversation search

## Screenshots
Dashboard: coming soon
OpenWA connection: coming soon

## Smoke Tests
npm test (health, metrics, inbound, escalation, rate limit)