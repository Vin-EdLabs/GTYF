import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

/**
 * The server package folder (the one with @gtyf/server's package.json), found by
 * walking up from this file. Works the same from src/ (tsx), dist/, dist/db/ or a
 * bundled chunk, so file paths never depend on how or where the server was started.
 */
export function serverRoot(): string {
  if (cached) return cached;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const pkg = path.join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, 'utf8')).name === '@gtyf/server') return (cached = dir);
      } catch {
        /* keep walking */
      }
    }
    dir = path.dirname(dir);
  }
  throw new Error('Could not find the server folder (package.json named @gtyf/server).');
}

export const fromServerRoot = (...parts: string[]) => path.join(serverRoot(), ...parts);
