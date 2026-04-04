import { ClientStore, Proxy } from "../../types/etc";
import { Client as proteusTLS } from "../request/client";
import CookieJar from "../request/jar";
import { formatProxy } from "./Proxies";
import { randomTLS } from "./TLSHelpers";

export default class ClientCycle {
  private clientCollection: ClientStore[];
  private noProxyClientInfo: ClientStore;
  private index: number;

  constructor(proxies: Proxy[] = []) {
    this.clientCollection = [];

    const random = randomTLS();
    this.noProxyClientInfo = {
      client: new proteusTLS(),
      isInited: false,
      proxy: undefined,
      preset: random.preset,
      headers: random.headers,
      jar: new CookieJar(),
    };

    this.addList(proxies);
    this.index = 0;
  }

  ensureIndex(): void {
    if (this.index >= this.clientCollection.length) {
      this.index = 0;
    }
  }

  async ensureInit(info: ClientStore): Promise<ClientStore> {
    if (!info.isInited) {
      await info.client.init({
        type: "preset",
        preset: info.preset,
        proxy: info.proxy ? formatProxy(info.proxy) : info.proxy,
        timeout: 7000,
      });

      info.isInited = true;
    }

    return info;
  }

  async getNoProxyClientInfo(): Promise<ClientStore | undefined> {
    return await this.ensureInit(this.noProxyClientInfo);
  }

  async getProxyClientInfo(proxy: Proxy): Promise<ClientStore | undefined> {
    if (!this.includes(proxy)) this.add(proxy);

    const info = this.clientCollection.find((info) => info.proxy == proxy);

    return info && (await this.ensureInit(info));
  }

  async next(): Promise<ClientStore> {
    this.index++;
    this.ensureIndex();
    const info = this.clientCollection.length
      ? this.clientCollection[this.index]
      : this.noProxyClientInfo;

    return await this.ensureInit(info);
  }

  remove(proxy: Proxy): void {
    this.clientCollection = this.clientCollection.filter((item) => item.proxy != proxy);
  }

  length(): number {
    return this.clientCollection.length;
  }

  includes(proxy: Proxy): boolean {
    return this.clientCollection.some(
      (item) => item.proxy?.host == proxy.host && item.proxy?.port == proxy.port
    );
  }

  add(proxy: Proxy): void {
    if (!proxy || this.includes(proxy)) return;

    const random = randomTLS();
    this.clientCollection.push({
      client: new proteusTLS(),
      isInited: false,
      proxy: proxy,
      preset: random.preset,
      headers: random.headers,
      jar: new CookieJar(),
    });
  }

  addList(proxies: Proxy[]): void {
    proxies.forEach((proxy) => {
      this.add(proxy);
    });
  }
}
