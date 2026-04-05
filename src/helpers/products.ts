import { prisma } from "./db";
import { AmazonProduct } from "../types/amazon";

export const getProducts = async (): Promise<AmazonProduct[]> => {
    return await prisma.products.findMany() as AmazonProduct[];
};
