import { AxiosResponse } from "axios";
import { Client } from "../helpers/request/client";
import CookieJar from "../helpers/request/jar";
import { InternalAccount, Offer } from "./amazon";
export type Site = "amazonUS" | "amazonCA" | "amazonUK";

export interface InternalMessage {
  offers: Offer[];
  extraData?: StringObject;
}
export interface StringObject {
  [key: string]: string;
}
export interface Proxy {
  protocol: "http" | "https";
  auth?: {
    username: string;
    password: string;
  };
  host: string;
  port: number;
}

export interface ResponseResult {
  response: AxiosResponse;
  product: InternalProduct;
  account: InternalAccount;
}

export interface BatchedResponseResult {
  response: AxiosResponse;
  product: InternalProduct[];
  account: InternalAccount;
}

export interface InternalProduct {
  asin: string;
  offeringID: string;
  title: string;
}

export interface ClientStore {
  client: Client;
  isInited: boolean;
  proxy: Proxy | undefined;
  preset: string;
  headers: [string, string][];
  jar: CookieJar;
}

export interface TLSInfo {
  headers: [string, string][];
  preset: string;
}

export interface groupStorage {
  [groupNumber: number]: ClientStore;
}

export interface Pinger {
  offer: Offer;
  interval?: NodeJS.Timeout;
  active: boolean;
}

export interface PingerData {
  offer: Offer;
  extraData?: StringObject;
}
