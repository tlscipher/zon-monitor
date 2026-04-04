import { productToOffer } from "../helpers/parsers";
import { BaseMonitor } from "./BaseMonitor";
import { workerData, isMainThread } from "worker_threads";
import {
  InternalProduct,
  Proxy,
  ResponseResult,
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

export const AmazonUStestAsin = {
  asin: "B07FZ8S74R",
  title:
    "Echo Dot (3rd Gen, 2018 release) - Smart speaker with Alexa - Charcoal",
  offeringID:
    "E0us7NyB7mrsgIJUDqHOGmU0YEivpj1%2FjCubUs3840KdYQAC1Hp%2FWUZtO7%2FLsYV1%2BcdUHKF4L2xmnKi7cZJZb6%2BU1wo3ui618e5asNB44HJW5QjWSYjbBf3AkMFaiINyRyL10D3VV7NcRy2kPxHdDQ%3D%3D",
};
export default class AmazonUS extends BaseMonitor {
  readonly marketplaceId = MarketplaceId.US;
  readonly site = "amazonUS";
  readonly testProduct: InternalProduct = AmazonUStestAsin;
  constructor(proxies: Proxy[], cookieString: string) {
    super(cookieString, proxies);
  }

  async request(
    product: InternalProduct,
    account: InternalAccount
  ): Promise<AxiosResponse> {
    return await account.client({
      method: "put",
      url: "https://tvss.amazon.com/marketplaces/ATVPDKIKX0DER/cart/items?sif_profile=tvss",
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
        items: [
          {
            quantity: getRandom(20, 100),
            asin: product.asin,
            offerId: product.offeringID,
          },
        ],
      },
      validateStatus: null,
      timeout: 2000,
      proxy: this.proxyCycle.next(),
    });
  }

  async process(result: ResponseResult): Promise<void> {
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

      // Check if OOS
      if (
        messages.length !== 0 &&
        messages.some(
          (message) =>
            message.message.toLowerCase().includes(oosMessageSnippet) &&
            message.asin === null &&
            message.itemId === null &&
            message.offerId === null
        )
      ) {
        return;
      }

      const offer = productToOffer(
        result.product,
        this.site,
        this.marketplaceId
      );

      // Check if fake
      // if (messages.length === 0 && result.response.data.shoppingCartItemCount === 0) {
      //   const embed = new MessageBuilder()
      //     .setText("Ignoring fake restock")
      //     .setTitle(offer.title ?? offer.asin)
      //     .setThumbnail(offer.imageURL!)
      //     .addField("Price", dollarFormatter.format(offer.price), true)
      //     .addField("Seller", offer.seller, true)
      //     .addField(
      //       "ATC",
      //       `[Click](https://www.amazon.com/gp/aws/cart/add.html?Quantity.1=1&OfferListingId.1=${offer.offeringID})`,
      //       true
      //     )
      //     .addField("ASIN", offer.asin, true)
      //     .addField("Seen at", offer.seenTimestamp.toString(), true)
      //     .addField("Account", result.account.info.email, true)
      //     .addField("OfferId", "```\n" + offer.offeringID + "\n```")
      //     .setColor(16321662)
      //     /* eslint-disable */
      //     //@ts-ignore
      //     .setURL(`https://www.amazon.com/dp/${offer.asin}`);
      //   /* eslint-enable */

      //   this.etcWebhook.send(embed);
      //   return;
      // }

      //const productMessage = messages.find((message) => message.asin === result.product.asin);

      log("Detected " + result.product.asin + " in stock (OfferID)", "green");
      this.processOffers({
        offers: [offer],
        extraData: {
          Data:
            "```json\n" +
            JSON.stringify(result.response.data ?? "{}", null, 4).slice(
              0,
              950
            ) +
            "```",
        },
      });

      // for (const message of messages) {
      //   if (!message.asin || !message.offerId) continue;
      //   const current = this.products.find((product) => product.asin === message.asin);
      //   if (current && message.offerId !== current.offeringID) {
      //     this.etcWebhook.send(
      //       new MessageBuilder()
      //         .setThumbnail(getProductImage(message.asin))
      //         .setFooter("eStock Serverside", "https://i.imgur.com/orK7ZxT.png")
      //         .setColor(14027061)
      //         .setAuthor(
      //           "New OfferId Detected!",
      //           "https://www.logotaglines.com/wp-content/uploads/2016/08/td-amazon-smile-logo-01-large-1200x975.jpg"
      //         )
      //         .setTitle(current.title ?? current.asin)

      //         .addField("ASIN", message.asin, true)
      //         .addField("Account", "||" + result.account.info.email + "||", true)
      //         .addField("Old OfferId", "```\n" + current.offeringID + "\n```")
      //         .addField("New offerId", "```\n" + message.offerId + "\n```")
      //         .addField("Message", "```\n" + message.message + "\n```")
      //         .setFooter(
      //           `eStock Serverside • ${new Date().toUTCString()}`,
      //           "https://i.imgur.com/orK7ZxT.png"
      //         )
      //         .setTimestamp()

      //         /* eslint-disable */
      //         //@ts-ignore
      //         .setURL(`https://www.amazon.com/dp/${offer.asin}`)
      //       /* eslint-enable */
      //     );
      //   }
      // }
    }

    if (typeof error === "string") {
      const message = `[${result.product.asin}] [${result.account.info.email}] ${error}`;
      log(message, "red");

      if (result.response.status !== 503) {
        this.notifyError(new Error(message), extraErrorData);
      }
    }
  }
}

if (!isMainThread) {
  new AmazonUS(
    <Proxy[]>workerData.proxies,
    workerData.accountsPath
  );
}
