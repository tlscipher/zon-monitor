import { PrismaClient } from ".prisma/client";
import {AmazonProduct} from "../types/amazon";

export const getProducts = async (): Promise<AmazonProduct[]> => {
    const prisma = new PrismaClient();
    return await prisma.products.findMany() as AmazonProduct[]
}