import { productToOffer } from "../helpers/parsers";
import { BatchedBaseMonitor } from "./BatchedBaseMonitor";
import { workerData, isMainThread } from "worker_threads";
import {
  BatchedResponseResult,
  InternalProduct,
  Proxy,
  StringObject,
} from "../types/etc";
import {
  generateAmazonRID,
  generateAppUUID,
  getRandom,
  log,
  MarketplaceId,
  oosMessageSnippet,
} from "../helpers/etc/utls";
import { AxiosResponse } from "axios";
import { InternalAccount, VVMessage } from "../types/amazon";

export const AmazonUKtestAsin = {
  asin: "B07PJV3JPR",
  title: "Echo Dot (3rd Gen) - Smart speaker with Alexa - Charcoal Fabric",
  offeringID:
    "ff9%2BNp%2FnHDt%2FfXBWsyly0O3K9Vh6K%2B3EDAsX12MmajTWz%2BJHE6ghX4a3CcT%2FWw6K9xZLlXVK2CsI2wOIVHXsuCTfKner0mF7DGo4GHKmyFXG%2FdLqA%2FPYJ32eVVTZbDqI",
};

export default class AmazonUKBatched extends BatchedBaseMonitor {
  readonly marketplaceId = MarketplaceId.UK;
  readonly site = "amazonUK";
  readonly testProduct: InternalProduct = AmazonUKtestAsin;
  constructor(proxies: Proxy[], cookieString: string) {
    super(cookieString, proxies);
  }

  async request(
    products: InternalProduct[],
    account: InternalAccount
  ): Promise<AxiosResponse> {
    return await account.client({
      method: "put",
      url: "https://tvss-eu.amazon.com/marketplaces/A1F83G8C2ARO7P/cart/items?sif_profile=tvss",
      headers: {
        "x-amz-access-token": account.info.access_token,
        accept:
          'application/vnd.com.amazon.tvss.api+json; type="cart.add.response/v1"',
        "x-amz-msh-appid": `name=ShopTV3P;ver=2000610;device=AFTMM;os=Android_7.1.2;UDID=${generateAppUUID()} ;tag=mshop-amazon-us-20;`,
        cookie: account.info.websiteCookieString,
        "x-amzn-RequestId": generateAmazonRID(),
        "Content-Type":
          'application/vnd.com.amazon.tvss.api+json; type="cart.add.request/v1"',
        "user-agent": `AMZN(SetTopBox/Amazon Fire TV Mantis/AKPGW064GI9HE,Android/7.1.2,ShopTV3P/release/2.0)`,
      },
      data: {
        items: products.map((product) => ({
          quantity: getRandom(20, 100),
          asin: product.asin,
          offerId: product.offeringID,
        })),
      },
      validateStatus: null,
      timeout: 2000,
      proxy: this.proxyCycle.next(),
    });
  }

  async process(result: BatchedResponseResult): Promise<void> {
    let error;
    const extraErrorData: StringObject = {};
    if (result.response.status != 200) {
      error = `Status Code: ${result.response.status}`;
    } else if (
      typeof result.response.data !== "object" ||
      !Array.isArray(result.response.data?.messages)
    ) {
      error = `Invalid Response:`;
      extraErrorData.response = (<string>(
        JSON.stringify(result.response.data)
      )).slice(0, 1024);
    } else {
      const messages: VVMessage[] = result.response.data.messages;
      messages.forEach((message) => {
        if (
          message.offerId !== null &&
          message.asin !== null &&
          message.itemId !== null
        ) {
          const product = result.product.find(
            (product) => product.asin === message.asin
          );
          if (!product) {
            console.log(`Product not found: ${message.asin}`);
            return;
          }

          const offer = productToOffer(product, this.site, this.marketplaceId);

          log("Detected " + product.asin + " in stock (OfferID)", "green");
          this.processOffers({
            offers: [offer],
            extraData: {
              monitor: "batched",
              Data:
                "```json\n" +
                JSON.stringify(result.response.data ?? "{}", null, 4).slice(
                  0,
                  950
                ) +
                "```",
            },
          });
        }
      });
    }

    if (typeof error === "string") {
      const message = `[${result.product
        .map((product) => product.asin)
        .join(",")}] [${result.account.info.email}] ${error}`;
      log(message, "red");

      if (result.response.status !== 503) {
        this.notifyError(new Error(message), extraErrorData);
      }
    }
  }
}

if (!isMainThread) {
  new AmazonUKBatched(
    <Proxy[]>workerData.proxies,
    workerData.accountsPath
  );
}
