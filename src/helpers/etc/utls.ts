import chalk from "chalk";
import { Site } from "../../types/etc";
import crypto from "crypto";

export enum MarketplaceId {
  US = "ATVPDKIKX0DER",
  UK = "A1F83G8C2ARO7P",
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getRandom = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const log = (
  message: string,
  color: typeof chalk.ForegroundColor
): void => {
  console.log(chalk[color](`[${new Date().toLocaleString()}] ${message}`));
};

export const generateAppUUID = (): string =>
  crypto.randomBytes(8).toString("hex");

export const generateAmazonRID = (): string =>
  crypto.randomBytes(10).toString("hex").toUpperCase();

export const dollarFormatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const oosMessageSnippet = "no longer available";

export const inStockSnips = [
  "you've requested more of",
  "has a limit of",
  "has increased from",
];

export const webhookIgnoredAsins = [
  "B01C3LW5JC",
  "B07YGJZSXF",
  "B07FZ8S74R",
  "B07PJV3JPR",
];

export const getChunks = <T extends Array<any>>(
  array: T,
  maxSize: number
): T[] => {
  const chunks: T[] = [];
  for (let i = 0; i < array.length; i += maxSize)
    chunks.push(<T>array.slice(i, i + maxSize));
  return chunks;
};

export const shuffleArray = <T extends Array<any>>(array: T): T => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const getProductImage = (asin: string): string =>
  `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN=${asin}&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=SL250`;

export const Webhooks = {
  default:
    "https://discord.com/api/webhooks/1490094316952223784/FAt8_29ICHeI1PxRLJ5486asb1lDdQt8nGaflo6Fx--vBeCCDniKa3pXDlgWcgfQQ6x9",
  errors:
    "https://discord.com/api/webhooks/1490094316952223784/FAt8_29ICHeI1PxRLJ5486asb1lDdQt8nGaflo6Fx--vBeCCDniKa3pXDlgWcgfQQ6x9",
  etc: "https://discord.com/api/webhooks/1490094316952223784/FAt8_29ICHeI1PxRLJ5486asb1lDdQt8nGaflo6Fx--vBeCCDniKa3pXDlgWcgfQQ6x9",
};

export const productToTopic = (asin: string, site: Site): string =>
  `${site}/${asin}`;
