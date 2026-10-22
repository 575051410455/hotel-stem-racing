// Keeps bulky, regenerated folders out of iCloud Drive when the repo lives in a synced folder
// (~/Documents is synced on the dev Mac). iCloud syncing node_modules breaks npm's renames
// (ENOTEMPTY) and can evict files. Sets macOS's File Provider "ignore" attribute; runs after
// every npm install via `postinstall`, and does nothing outside macOS (e.g. in Docker).

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

if (process.platform === "darwin") {
  for (const folder of ["node_modules", ".next", ".claude/worktrees"]) {
    try {
      mkdirSync(folder, { recursive: true });
      execFileSync("xattr", ["-w", "com.apple.fileprovider.ignore#P", "1", folder]);
    } catch (error) {
      console.warn(`[icloud-exclude] could not exclude ${folder}: ${error.message}`);
    }
  }
}
