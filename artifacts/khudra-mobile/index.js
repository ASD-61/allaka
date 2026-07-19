// Local entry file. In a pnpm monorepo, pointing `main` directly at
// "expo-router/entry" makes Expo compute a broken relative path to the entry
// (it lives deep under the workspace-root .pnpm store), so the release JS
// bundle fails to resolve it. Re-exporting it from an app-local file gives
// Metro a real, in-tree entry to start from, then normal module resolution
// (with the monorepo metro.config.js) finds expo-router itself.
import 'expo-router/entry';
