# SupportWA (v0.4 - Real AI Provider)

## AI Provider
- OpenAI-compatible /chat/completions
- Env: AI_API_KEY, AI_BASE_URL, AI_MODEL
- 8s timeout, 2 retries + backoff
- Safe stub fallback (no key) + error fallback + escalate
- Structured logs: [AI] provider call / success / error (no secrets)

## Smoke
npm test (requires server)

## Run
Same as before. Docker/local unchanged.