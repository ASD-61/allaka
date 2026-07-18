---
name: Expo RTL for Arabic-first apps
description: Preferred approach for building right-to-left Arabic UI in Expo/React Native instead of I18nManager.forceRTL.
---

Use manual RTL styling (`flexDirection: 'row-reverse'`, `textAlign: 'right'` per component) instead of `I18nManager.forceRTL(true)`.

**Why:** `forceRTL` requires an app reload/restart to take effect and behaves inconsistently in Expo Go / dev preview (stale layout direction until full reload), which breaks the live preview workflow. Manual per-component RTL styling applies immediately and is fully visible in hot-reloaded previews.

**How to apply:** For any Arabic-first (or other RTL-primary) Expo app, style each row/flex container explicitly with `row-reverse` and set `textAlign: 'right'` on text, rather than relying on the global RTL flag.
