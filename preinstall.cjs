// Cross-platform preinstall guard (works on Windows/macOS/Linux — the old
// `sh -c '...'` form failed on Windows cmd/PowerShell because `sh` isn't
// available there, which made `pnpm install` exit 1 and appear to "hang").
//
// It does two things:
//   1) Removes stray npm/yarn lockfiles so only pnpm-lock.yaml is ever used.
//   2) Enforces using pnpm (not npm/yarn) — but skips that check on CI / EAS
//      build machines where the package-manager user agent may differ.
const fs = require("fs");

for (const f of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.rmSync(f, { force: true });
  } catch {
    // ignore — the file may not exist
  }
}

// Don't block automated build environments.
if (process.env.CI || process.env.EAS_BUILD) {
  process.exit(0);
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.startsWith("pnpm/")) {
  console.error("Use pnpm instead (run: pnpm install)");
  process.exit(1);
}
