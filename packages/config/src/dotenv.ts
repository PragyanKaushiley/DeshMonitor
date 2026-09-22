import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenvFile } from "dotenv";

function findEnvFile(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

let loaded = false;

export function loadDotenv(): void {
  if (loaded) return;
  loaded = true;

  const envFile = findEnvFile(process.cwd());
  if (envFile) {
    loadDotenvFile({ path: envFile });
  }
}
