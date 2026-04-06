import { AxiosInstance } from "axios";
import { Site } from "./etc";
import { Account as PrismaAccount } from ".prisma/client";
import { MarketplaceId } from "../helpers/etc/utls";

export interface InternalAccount {
  info: PrismaAccount;
  client: AxiosInstance;
}
export interface Product {
  title?: string;
  imageURL?: string;
  asin: string;
}

export interface VVMessage {
  message: string;
  itemId: null | string;
  asin: null | string;
  offerId: null | string;
}

export interface VVResponse {
  messages: VVMessage[];
  shoppingCartItemCount: number;
}

export interface Offer extends Product {
  price: number;
  marketplaceId: MarketplaceId;
  shippingPrice: number;
  site: Site;
  seller: string;
  condition: boolean;
  offeringID: string;
  seenTimestamp: number;
}

export interface AmazonProduct {
  asin:        string;
  offeringID:  string;
  title:       string;
}

export interface AmazonAccount {
  email: string;
  marketplaceId: string;
  websiteCookieString: string;
  access_token: string | null;
  userId: string;
}
