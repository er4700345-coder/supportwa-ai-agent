# SupportWA AI Agent

Production WhatsApp AI Support on OpenWA.

## Architecture
Customer WhatsApp → OpenWA → SupportWA (webhook) → AI Engine → OpenWA send → Customer

## OpenWA Setup (Choose One)

### Option 1: Local (Recommended for Dev)
```bash
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
npm install
npm run dev
```
- Dashboard: http://localhost:2886
- API: http://localhost:2785/api
- Webhook target: http://your-supportwa:4000/webhooks/openwa

### Option 2: Docker
```bash
docker compose up -d
```
Same ports. Ensure SupportWA can reach http://localhost:2785/api

## SupportWA Setup
```bash
git clone https://github.com/er4700345-coder/supportwa-ai-agent.git
cd supportwa-ai-agent
cp .env.example .env
# Edit OPENWA_API_URL and AI_API_KEY
docker-compose up --build
```

## Config (.env)
OPENWA_API_URL=http://localhost:2785/api
AI_PROVIDER=openai
AI_API_KEY=sk-...
DATABASE_URL=sqlite:./supportwa.db  # or postgres
PORT=4000

## MVP Features
- Webhook receive + AI reply
- Conversation store (SQLite/Postgres)
- Escalation to human
- Admin dashboard (http://localhost:4000/admin)
- Health checks

## Safety
Customer support only. No mass messaging.