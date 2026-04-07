import { EventEmitter } from "ws";
import {
  BatchedResponseResult,
  groupStorage,
  InternalMessage,
  InternalProduct,
  Proxy,
  ResponseResult,
  Site,
} from "../types/etc";
import { isMainThread, parentPort } from "worker_threads";
import {
  getRandom,
  log,
  MarketplaceId,
  shuffleArray,
  sleep,
  Webhooks,
} from "../helpers/etc/utls";
import { Webhook, MessageBuilder } from "discord-webhook-node";
import Cycle from "../helpers/etc/Cycle";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { productToOffer as parseVVAtc } from "../helpers/parsers";
import { readFile } from "fs";
import { AmazonProduct, InternalAccount } from "../types/amazon";
import { Account } from ".prisma/client";
import _ from "lodash";
import { getProducts } from "../helpers/products";
import { prisma } from "../helpers/db";

export abstract class BatchedBaseMonitor extends EventEmitter {
  protected testProductInterval?: NodeJS.Timeout;
  protected monitorStatus?: boolean;
  protected groupStorage: groupStorage = {};
  //protected maxProductCount: number;
  protected accountCycle!: Cycle<InternalAccount>;
  protected proxyCycle: Cycle<Proxy>;
  protected products: InternalProduct[] = [];
  protected etcWebhook: Webhook = new Webhook(Webhooks.etc);
  protected errorWebhook: Webhook = new Webhook(Webhooks.errors);
  protected cycleNum: number = 0;
  protected accountsDB = prisma;
  abstract readonly marketplaceId: MarketplaceId;
  abstract readonly site: Site;
  abstract readonly testProduct: InternalProduct;
  protected inited: boolean = false;
  constructor(
    protected accountsPath: string,
    protected proxies: Proxy[],
    readonly toSendTestProduct: boolean = true
  ) {
    super();

    if (isMainThread) {
      console.error("Monitor Started Without Handler! (On main thread)");
      process.exit(1);
    }

    this.proxyCycle = new Cycle(proxies);

    // log(
    //   `Running ${accounts.length} accounts with ${this.maxProductCount} products allowed`,
    //   "green"
    // );

    this.startMonitorLoop();

    // if (this.toSendTestProduct) {
    //   this.testProductInterval = setInterval(
    //     this.sendTestProduct.bind(this),
    //     5000
    //   );
    // }
  }

  async init(): Promise<void> {
    if (this.inited) return;
    log("Loading accounts...", "yellow");

    const accounts = await this.accountsDB.account.findMany({});

    if (accounts.length === 0) {
      log("No accounts, retrying in 15 seconds...", "red");

      return await this.init();
    }

    this.accountCycle = new Cycle(
      shuffleArray(
        accounts.map((account: Account) => {
          return { info: account, client: this.makeAccountClient() };
        })
      )
    );

    log(`Loaded ${this.accountCycle.length()} accounts`, "green");

    this.inited = true;
  }

  protected abstract request(
    products: InternalProduct[],
    account: InternalAccount
  ): Promise<AxiosResponse>;

  protected abstract process(result: BatchedResponseResult): Promise<void>;

  protected getMapFN(
    requestFN: (
      products: InternalProduct[],
      account: InternalAccount
    ) => Promise<AxiosResponse>,
    processFN: (result: BatchedResponseResult) => Promise<any>
  ): (product: InternalProduct[]) => Promise<void> {
    const _requestFN = requestFN.bind(this);
    const _processFN = processFN.bind(this);

    return async (product: InternalProduct[]) => {
      try {
        //await sleep(getRandom(500, 1500));
        const account = this.accountCycle.next()!;
        const response = await _requestFN(product, account);
        await _processFN({
          product,
          response,
          account,
        });
      } catch (err: any) {
        log(
          `[${product.map((p) => p.asin).join(",")}] ${err.toString()}`,
          "red"
        );
        if (err.code === "ECONNABORTED") return;
        this.notifyError(err);
      }
    };
  }

  protected makeAccountClient(): AxiosInstance {
    return axios.create();
  }

  public sendTestProduct(): void {
    const offer = parseVVAtc(this.testProduct, this.site, this.marketplaceId);
    this.processOffers({ offers: [offer] });
  }

  public fetchNewProducts(): Promise<void> {
    return new Promise((res, rej) => {
      getProducts().then((result: AmazonProduct[]) => {
        this.products = result;
        res();
      });
    });
  }

  protected async startMonitorLoop(): Promise<void> {
    this.monitorStatus = true;
    await this.init();

    while (this.monitorStatus) {
      if (this.cycleNum % 10 === 0) {
        try {
          await this.fetchNewProducts();
        } catch (err: any) {
          log(`Error reading products: ${err.toString()}`, "red");
        }
      }

      this.cycleNum++;

      const startTime = Date.now();
      //const products = this.products.slice(0, this.maxProductCount);

      await Promise.allSettled(
        _.chunk(this.products, 5).map(this.getMapFN(this.request, this.process))
      );

      log(
        `[${this.site}] [BATCHED] Processed ${
          this.products.length
        } requests in ${
          (Date.now() - startTime) / 1000
        } seconds with ${this.accountCycle.length()} accounts available`,
        "gray"
      );

      await sleep(getRandom(250, 500));
    }
  }

  protected notifyError(
    error: Error,
    additionalFields: { [key: string]: string } = {}
  ): void {
    const embed = new MessageBuilder()
      .setFooter("eStock Serverside", "https://i.imgur.com/orK7ZxT.png")
      .setColor(14027061)
      .setTitle("Error")
      .addField("Message", error.message)
      .setFooter(
        `eStock Serverside • ${new Date().toUTCString()}`,
        "https://i.imgur.com/orK7ZxT.png"
      );

    if (Object.keys(additionalFields).length > 0) {
      for (const [key, value] of Object.entries(additionalFields)) {
        embed.addField(key, value);
      }
    }

    embed.addField("Stack", error.stack ?? "None");

    this.errorWebhook.send(embed);
  }

  protected processOffers(message: InternalMessage): void {
    parentPort?.postMessage(message);
  }

  public stopMonitor(): void {
    this.monitorStatus = false;
  }
}
