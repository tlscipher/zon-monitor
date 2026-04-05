import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(__dirname, "..", "data", "yoski.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n").slice(1); // skip header

  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split(",");
    // title may contain commas inside quotes, so rejoin everything before ASIN
    // CSV format: Product Name, ASIN, Offer ID, Config ID, Notes
    // ASIN is always a 10-char alphanumeric starting with B0
    const asinIndex = parts.findIndex((p) => /^B[A-Z0-9]{9}$/.test(p.trim()));
    if (asinIndex === -1) {
      skipped++;
      continue;
    }

    const title = parts.slice(0, asinIndex).join(",").replace(/^"|"$/g, "").trim();
    const asin = parts[asinIndex].trim();
    const offeringID = parts[asinIndex + 1]?.trim();

    if (!asin || !offeringID) {
      console.log(`Skipping ${asin || "unknown"}: missing ASIN or offeringID`);
      skipped++;
      continue;
    }

    await prisma.products.upsert({
      where: { asin },
      create: { asin, offeringID, title, users: 0 },
      update: {},
    });

    console.log(`Upserted ${asin} - ${title.slice(0, 60)}`);
    added++;
  }

  console.log(`\nDone: ${added} upserted, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
