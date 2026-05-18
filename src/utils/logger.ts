export function log(event: string, data: Record<string, any> = {}) {
  const safe = { ...data };
  delete safe.apiKey; delete safe.token; delete safe.secret;
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}

export const reqId = () => Math.random().toString(36).slice(2, 10);