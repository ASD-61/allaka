---
name: Replit connector proxy account-ID templating
description: How to call connector-specific REST APIs (e.g. Twilio) through @replit/connectors-sdk without exposing account credentials to app code, and a credential-type gotcha with the {accountSid} placeholder.
---

`ReplitConnectors.listConnections()` (impure sandbox global) DOES return a `settings` object per connection (e.g. Twilio: `account_sid`, `api_key`, `api_key_secret`, `phone_number`), but values are redacted (`"[redacted]"`) — useful for seeing which fields exist and their freshness (`credentialsLastFetched`), not for reading actual values.

For authenticated calls from app code, use `connectors.proxy(connectorName, path, options)`. Twilio's connector supports putting the literal placeholder text `{accountSid}` directly in the path (e.g. `/2010-04-01/Accounts/{accountSid}/Messages.json`) — the proxy substitutes it server-side and injects auth.

**Gotcha confirmed 2026-07-11:** the `{accountSid}` placeholder only auto-resolves when the Twilio connection is set up with an **API Key + API Key Secret** pair. If the connection instead uses **Account SID + Auth Token** (entered into the same `api_key`/`api_key_secret` form fields — Twilio's Basic Auth accepts both credential shapes), the placeholder is NOT substituted and Twilio itself 404s on the literal string `{accountSid}`. Workaround: store the real account SID as a plain (non-secret) env var and interpolate it into the path yourself — the account SID is not sensitive.

**Twilio 70051 "no requested permission"** on every call, including plain reads, means the connected API Key is a *Restricted* key lacking the needed permission scope (e.g. Programmable Messaging) — not a stale-connection issue; re-running `ProposeIntegration` on an already-`added` connection just rebinds the same credentials and does not fix it or let you edit them.

**To actually replace a connection's stored credentials** (e.g. switching from a bad Restricted API Key to Account SID + Auth Token), `ProposeIntegration` on an `added` connection is insufficient — the user must fully disconnect the connector from their Replit account settings first (Settings → Connectors → disconnect), then `searchIntegrations` returns it as `not_setup` again and `ProposeIntegration` on that fresh connector opens a real credential-entry form.

**Twilio WhatsApp Sandbox note:** even with a fully-permissioned connection, a Trial Twilio account's shared WhatsApp Sandbox number only delivers to phone numbers that have manually opted in (sent a "join <code>" WhatsApp message to the sandbox number) — error 63015 otherwise. This blocks arbitrary real customers; production needs an approved WhatsApp Business sender.
