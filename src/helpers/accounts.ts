import { PrismaClient } from ".prisma/client";
import {AmazonAccount} from "../types/amazon";

export const getAccounts = async (): Promise<AmazonAccount[]> => {
    const prisma = new PrismaClient();
    return await prisma.account.findMany() as AmazonAccount[]
}