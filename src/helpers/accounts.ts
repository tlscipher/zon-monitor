import { prisma } from "./db";
import { AmazonAccount } from "../types/amazon";

export const getAccounts = async (): Promise<AmazonAccount[]> => {
    return await prisma.account.findMany() as AmazonAccount[];
};
