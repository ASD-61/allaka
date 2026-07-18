# عـلاّكـة (Allaka)

Arabic-first multi-vendor marketplace app for Iraqi shops (grocery, produce, and other store types), where customers browse stores, shop within a store, and merchants register their own store for admin approval.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Delivery app for real Iraqi shops, branded عـلاّكـة (Allaka). The real catalog (6 categories, 16 vegetable products with IQD prices/units/photos) is versioned in `scripts/src/seed-catalog.ts` — run `pnpm --filter @workspace/scripts run seed:catalog` to (re)seed it; the script fully replaces `categories` and `products` in a transaction, so it's safe to re-run. Day-to-day catalog edits still happen via the admin dashboard (`/admin` in the mobile app). Products' `category` is a free-text string, not a foreign key to `categories`, so renaming/deleting a category via the admin UI does not update existing products (see follow-up task).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

- **Twilio connection must use Account SID + Auth Token, not a Restricted API Key (fixed 2026-07-11).** A Restricted API Key without the Programmable Messaging scope fails every request with error 70051 ("no requested permission"), including basic account reads — reconnecting the same key type doesn't help since the key itself lacks the scope. The connector now uses the account's Account SID + Auth Token, which always has full permissions. **Side effect:** the connector proxy's `{accountSid}` URL placeholder only auto-resolves for API Key-based connections — with Account SID + Auth Token it 404s, so `whatsapp.ts` spells out the SID explicitly via the `TWILIO_ACCOUNT_SID` env var instead.
- **Twilio account is a Trial account using the free WhatsApp Sandbox number** (+1 415-523-8886, `DEFAULT_FROM` in `whatsapp.ts`). Any recipient phone must first WhatsApp-message a join code to that number (Twilio Console → Messaging → Try it out) before they can receive anything from it — otherwise sends fail with error 63015. This makes the sandbox unusable for arbitrary real customers signing up for OTP login. **Going live is a real-world business process the agent cannot do on the user's behalf** — it needs the account owner's Twilio billing details and Meta Business Manager verification, and Meta's review can take days. Confirmed still on Trial as of 2026-07-11 (see follow-up task). To flip over once approved:
  1. Upgrade the Twilio account from Trial to a paid account (Twilio Console → billing).
  2. Register a WhatsApp Business sender for a real phone number and get it approved via Meta's WhatsApp Business Profile review (Twilio Console → Messaging → Senders → WhatsApp senders).
  3. Once approved, set the `TWILIO_WHATSAPP_FROM` env var to that approved number (E.164 format, e.g. `+9647...`) — the code already reads this override with no further changes needed (`whatsapp.ts`'s `DEFAULT_FROM` sandbox fallback is only used when it's unset).
  4. Smoke-test by sending an OTP to a phone number that has never joined the sandbox or interacted with the app before.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
