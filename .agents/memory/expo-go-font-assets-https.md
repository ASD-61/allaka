---
name: Expo Go font assets need https on Replit
description: Why icon fonts render invisible on physical devices in Expo Go behind the Replit dev proxy, and the required https rewrite.
---

**Rule:** When loading fonts (including `@expo/vector-icons` icon fonts) in Expo Go on a physical device behind the Replit dev proxy, resolve each font module with `Asset.fromModule(...).uri` and rewrite `http://` → `https://` before passing it to `useFonts`/`loadAsync`.

**Why:** Expo Go advertises the dev server via a scheme-less `hostUri`, so expo-asset builds `http://` asset URLs. The Replit expo proxy only serves real content over https; the http fetch returns garbage, fonts register corrupt *without throwing* (`fontsLoaded` is still true), Arabic/Latin text silently falls back to the system font, and icon glyphs (private-use codepoints) render completely invisible. The web preview masks the bug because browsers load fonts same-origin.

**How to apply:** Map the font source object through a helper that returns the https URI for numeric module sources (fall back to the original module on error). Vector-icon font keys are lowercase family names (e.g. `feather`, from `createIconSet(glyphMap, 'feather', font)`), not the component name. Diagnose via device logs streamed into the Metro workflow log (`console.log` of `Asset.fromModule(...).uri`).
