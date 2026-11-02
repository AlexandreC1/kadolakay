import fs from "node:fs";
import { randomBytes } from "node:crypto";
const path = ".env";
const existing = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
if (/^DATA_ENCRYPTION_KEY=/m.test(existing)) {
  console.log("Encryption key already configured. No changes made.");
} else {
  fs.appendFileSync(
    path,
    (existing.endsWith("\n") || !existing ? "" : "\n") +
      "DATA_ENCRYPTION_KEY=" +
      randomBytes(32).toString("base64") +
      "\n",
    { mode: 0o600 },
  );
  console.log(
    "Encryption key saved locally in ignored .env. Keep a secure offline copy with your deployment secrets. The key was not printed.",
  );
}
