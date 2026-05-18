# Changelog

## [0.1.0-support-mvp] - 2026-05-18

### Added
- OpenWA integration (webhook receive + send via API)
- WhatsApp message handling with flexible payload parsing
- AI provider layer (OpenAI-compatible chat completions + safe stub fallback)
- SQLite persistence (conversations + messages)
- Admin dashboard (view, escalate, resolve)
- Escalation mode with human handoff
- Metrics endpoint (/metrics)
- Per-contact rate limiting (10/min)
- Structured JSON logging with request IDs
- Docker + local run support
- Smoke tests for core flows

### Security
- No secrets in logs
- Inbound-only automation
- Rate limit to prevent loops

### Notes
Production-ready MVP for customer support. No mass messaging features.