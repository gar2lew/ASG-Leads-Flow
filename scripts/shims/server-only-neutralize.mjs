// Neutralizes the `server-only` package for standalone scripts (seed, admin setup).
// Usage: npx tsx --import ./scripts/shims/server-only-neutralize.mjs scripts/seed-dev-users.ts
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(import.meta.dirname, "..", "..", ".env.local") });

const emptyUrl = pathToFileURL(path.join(import.meta.dirname, "empty.mjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only" || specifier === "client-only") {
      return { url: emptyUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
