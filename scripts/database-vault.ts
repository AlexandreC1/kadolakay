import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat, appendFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Client } from "pg";
import { join, resolve } from "node:path";
try {
  process.loadEnvFile(".env");
} catch {
  /* Runtime env supported. */
}
const [mode, file] = process.argv.slice(2);
async function main() {
  if (!file || !["backup", "restore-test"].includes(mode))
    throw new Error(
      "Use backup <absolute-output> or restore-test <absolute-input>",
    );
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32)
    throw new Error("A 32-byte encryption key is required");
  const url = new URL(process.env.DATABASE_URL || "invalid:");
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("PostgreSQL URL required");
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE:
      url.searchParams.get("sslmode") ||
      (["localhost", "127.0.0.1"].includes(url.hostname)
        ? "prefer"
        : "verify-full"),
  };
  const binary = (name: string) =>
    process.env.POSTGRES_BIN ? join(process.env.POSTGRES_BIN, name) : name;
  const path = resolve(file);
  if (mode === "backup") {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from("BAYOU-BACKUP-1"));
    const handle = await open(path, "wx", 0o600);
    await handle.write(Buffer.concat([Buffer.from("BAYOU-BACKUP-1"), iv]));
    await handle.close();
    const child = spawn(
      binary("pg_dump"),
      ["--format=custom", "--no-owner", "--no-privileges"],
      { env, stdio: ["ignore", "pipe", "ignore"] },
    );
    const exit = new Promise<void>((ok, fail) => {
      child.once("error", () => fail(new Error("pg_dump unavailable")));
      child.once("exit", (code) =>
        code === 0 ? ok() : fail(new Error("pg_dump failed")),
      );
    });
    await Promise.all([
      exit,
      pipeline(child.stdout!, cipher, createWriteStream(path, { flags: "a" })),
    ]);
    await appendFile(path, cipher.getAuthTag());
    console.log(
      "Encrypted backup created. Keep its encryption key separately. Restore-test must pass before treating it as usable.",
    );
  } else {
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.endsWith("_test")
    )
      throw new Error(
        "Restore is restricted to a disposable loopback database ending _test",
      );
    const client = new Client({ connectionString: url.toString() });
    await client.connect();
    try {
      const check = await client.query(
        "SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname='public'",
      );
      if (check.rows[0].count !== 0)
        throw new Error(
          "Restore target must be empty; nothing has been overwritten",
        );
    } finally {
      await client.end();
    }
    const size = (await stat(path)).size;
    if (size < 43) throw new Error("Invalid backup");
    const handle = await open(path, "r");
    const header = Buffer.alloc(26),
      tag = Buffer.alloc(16);
    await handle.read(header, 0, 26, 0);
    await handle.read(tag, 0, 16, size - 16);
    await handle.close();
    if (header.subarray(0, 14).toString() !== "BAYOU-BACKUP-1")
      throw new Error("Invalid backup");
    // Authenticate the entire stream before feeding any SQL to PostgreSQL.
    const verify = createDecipheriv("aes-256-gcm", key, header.subarray(14));
    verify.setAAD(Buffer.from("BAYOU-BACKUP-1"));
    verify.setAuthTag(tag);
    for await (const chunk of createReadStream(path, {
      start: 26,
      end: size - 17,
    }))
      verify.update(chunk);
    verify.final();
    const decrypt = createDecipheriv("aes-256-gcm", key, header.subarray(14));
    decrypt.setAAD(Buffer.from("BAYOU-BACKUP-1"));
    decrypt.setAuthTag(tag);
    const child = spawn(
      binary("pg_restore"),
      [
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "--single-transaction",
        "--dbname",
        env.PGDATABASE,
      ],
      { env, stdio: ["pipe", "ignore", "ignore"] },
    );
    const exit = new Promise<void>((ok, fail) => {
      child.once("error", () => fail(new Error("pg_restore unavailable")));
      child.once("exit", (code) =>
        code === 0 ? ok() : fail(new Error("pg_restore failed")),
      );
    });
    await Promise.all([
      exit,
      pipeline(
        createReadStream(path, { start: 26, end: size - 17 }),
        decrypt,
        child.stdin!,
      ),
    ]);
    console.log(
      "Authenticated backup restored into the empty disposable test database. Verify row counts and constraints next.",
    );
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Backup operation failed",
  );
  process.exitCode = 1;
});
