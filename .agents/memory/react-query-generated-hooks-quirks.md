---
name: React Query generated hooks quirks (orval)
description: Two recurring TypeScript/runtime pitfalls when using orval-generated React Query hooks with this project's api-client-react package.
---

- `ApiError` thrown by the generated `custom-fetch.ts` has shape `{status, data, message, ...}`. Read the server's error message via `err?.data?.error`, not `err?.error` — the latter is always undefined and silently swallows real error text.
- Passing `{ query: { enabled: someBool } }` to a generated `useXxx` hook can fail TS with "Property 'queryKey' is missing" even though it works fine at runtime — the generated generic overloads don't infer correctly for this shape. Narrow the cast to just the options object at the call site rather than reaching for `as any` on the whole hook result or broader surrounding code; treat it as a workaround for this specific orval quirk, not a general pattern to reach for elsewhere.
