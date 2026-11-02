import { encryptField, decryptField } from "../src/lib/security-crypto";
try {
  process.loadEnvFile(".env");
} catch {
  /* Runtime env supported. */
}
const { db } = await import("../src/lib/db");
async function main() {
  const apply = process.argv.includes("--apply");
  let after: string | undefined,
    count = 0;
  for (;;) {
    const rows = await db.account.findMany({
      where: after ? { id: { gt: after } } : {},
      orderBy: { id: "asc" },
      take: 100,
    });
    if (!rows.length) break;
    for (const account of rows) {
      const data: Record<string, string> = {};
      for (const field of [
        "access_token",
        "refresh_token",
        "id_token",
      ] as const) {
        const value = account[field];
        if (!value) continue;
        const context = `oauth:${account.userId}:${account.provider}:${account.providerAccountId}:${field}`;
        if (value.startsWith("enc1.")) {
          decryptField(value, context);
          continue;
        }
        data[field] = encryptField(value, context);
      }
      if (Object.keys(data).length) {
        count++;
        if (apply)
          await db.account.updateMany({
            where: {
              id: account.id,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              id_token: account.id_token,
            },
            data,
          });
      }
    }
    after = rows.at(-1)!.id;
  }
  console.log(
    `${apply ? "Encrypted" : "Would encrypt"} legacy tokens for ${count} accounts. No credentials were printed.`,
  );
}
main()
  .catch(() => {
    console.error(
      "Token migration failed. Check database connectivity and encryption keys locally. No credentials were printed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
