import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = resolve(root, ".env.local");
const ignored = spawnSync("git", ["check-ignore", "--quiet", "--", ".env.local"], { cwd: root });
if (ignored.status !== 0) {
  console.error("Stopped: .env.local must be ignored by Git before credentials can be saved.");
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run npm run auth:setup in your own interactive terminal. Credentials are never accepted as command arguments.");
  process.exit(1);
}
let muted = false;
const output = new Writable({ write(chunk, encoding, next) { if (!muted) process.stdout.write(chunk, encoding); next(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const id = (await rl.question("Google OAuth client ID: ")).trim();
  if (!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) throw new Error("INVALID_CLIENT_ID");
  const secretPrompt = rl.question("Google client secret (input hidden): ");
  muted = true;
  const secret = (await secretPrompt).trim();
  muted = false; process.stdout.write("\n");
  if (!secret || secret.length > 1024 || /[\r\n\0*•…]/.test(secret)) {
    console.error("Use the full client secret from Google's creation dialog, not a masked value from the client list.");
    throw new Error("INVALID_SECRET");
  }
  if (secret.indexOf("GOCSPX-", 7) > 0) {
    console.error("The secret appears to have been pasted more than once. Retry and paste it only once.");
    throw new Error("REPEATED_SECRET");
  }
  let current = "";
  try { current = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  let base = "";
  try { base = await readFile(resolve(root, ".env"), "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const changes = { AUTH_GOOGLE_ID: id, AUTH_GOOGLE_SECRET: secret };
  // Never rotate an existing session secret while configuring a provider.
  if (!/^\s*AUTH_SECRET\s*=\s*["']?[^\s"']+/m.test(current + "\n" + base) && !process.env.AUTH_SECRET?.trim()) changes.AUTH_SECRET = randomBytes(32).toString("hex");
  for (const [key, value] of Object.entries(changes)) {
    const assignment = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "gm");
    current = pattern.test(current) ? current.replace(pattern, () => assignment) : `${current.trimEnd()}\n${assignment}\n`;
  }
  await writeFile(target, current, { mode: 0o600 });
  console.log("Google configuration saved to Git-ignored .env.local. No credential values were printed.");
  console.log("Restart the dev server, then open http://localhost:3000/login and choose Google.");
} catch {
  muted = false;
  console.error("Setup did not complete. Check the client ID and secret, then retry. Existing credentials are never printed.");
  process.exitCode = 1;
} finally { muted = false; rl.close(); }
