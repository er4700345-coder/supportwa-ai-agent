# SupportWA v0.5 - Production Hardened

## Production Features
- Structured JSON logs (request IDs, events, no secrets)
- /metrics (inbound/outbound/escalations/fallbacks/errors/uptime)
- Per-contact rate limit (10/min)
- Enhanced /health (DB, OpenWA, AI status, uptime)
- Centralized error middleware (clean JSON, no stacks)

## Smoke
npm test

## Run
Docker/local unchanged. Safe for production customer support.