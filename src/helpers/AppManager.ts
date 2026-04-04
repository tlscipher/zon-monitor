import uws, { WebSocket } from "uWebSockets.js";
type uWebSocket = WebSocket<{ uuid: string }>;
import { Offer, Product } from "../types/amazon";
import {
  dollarFormatter,
  log,
  productToTopic,
  webhookIgnoredAsins,
  Webhooks,
} from "./etc/utls";
import { MessageBuilder, Webhook } from "discord-webhook-node";
import {
  InternalMessage,
  Pinger,
  PingerData,
  StringObject,
} from "../types/etc";
import { v4 as uuidv4 } from "uuid";
import { AmazonUStestAsin } from "../monitors/AmazonUSBatched";
import { AmazonUKtestAsin } from "../monitors/AmazonUKBatched";
import { ClientMessage } from "../types/communication";
import { encrypt } from "./etc/encryption";

export const CLOUD_SECRET = "yDLJ963twC44fdenbfGjqrEnnxAw2Gg8";
export const CONSTANT_PING_TIMER = 3 * (60 * 1000);
export const PING_INTERVAL = 1e3;
export default class AppManager {
  private pingers: Pinger[] = [];
  public listening?: boolean;
  private totalClients: number = 0;
  private cloudConnections: uWebSocket[] = [];
  protected webhook: Webhook = new Webhook(Webhooks.default);
  constructor(
    protected products: Product[],
    protected app: uws.TemplatedApp = uws.App(),
    readonly wsEndpoint: string = "/amazon"
  ) {
    this.app.ws<{ uuid: string }>(this.wsEndpoint, {
      idleTimeout: 12,
      compression: uws.SHARED_COMPRESSOR,
      upgrade: (res, req, context) => {
        res.upgrade({ uuid: "" }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
      },
      open: this.clientOpenHandler.bind(this),
      message: this.clientMessageHandler.bind(this),
      close: this.clientCloseHandler.bind(this),
    });
    this.app.get("/amazon/products", (res, req) => {
      log(
        "Serving products to " + req.getHeader("x-forwarded-for"),
        "cyanBright"
      );
      res
        .writeStatus("200 OK")
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify(products));
    });
  }

  private clientOpenHandler(socket: uWebSocket): void {
    socket.getUserData().uuid = uuidv4();
    this.totalClients += 1;
  }

  private clientCloseHandler(socket: uWebSocket): void {
    this.totalClients -= 1;
    const socketId = socket.getUserData().uuid;

    if (
      this.cloudConnections.findIndex(
        (cloudSocket) => cloudSocket.getUserData().uuid === socketId
      ) !== -1
    ) {
      log("Cloud instance disconnected", "redBright");
      this.cloudConnections = this.cloudConnections.filter(
        (cloudSocket) => cloudSocket.getUserData().uuid !== socketId
      );
    }
  }

  private clientMessageHandler(
    ws: uWebSocket,
    messageBuffer: ArrayBuffer
  ): void {
    const message = new TextDecoder().decode(messageBuffer);

    if (message === CLOUD_SECRET) {
      log("Cloud instance connected", "magenta");
      this.cloudConnections.push(ws);
      return;
    }

    if (message.includes("ping")) {
      this.send(ws, "pong", "ponging");
      return;
    } else if (message.includes("pong")) {
      return;
    }

    try {
      const data = <ClientMessage>JSON.parse(message);

      if (!data.action || !data.input || !data.site) {
        log("Invalid Object in message: " + message, "red");
        return;
      }

      switch (data.action) {
        case "subscribe":
          ws.subscribe(productToTopic(data.input, data.site));
          break;

        case "unsubscribe":
          ws.unsubscribe(productToTopic(data.input, data.site));
          break;
      }
    } catch (err: any) {
      log("Error while proccesing message: " + err.toString(), "red");
    }
  }

  private send(ws: uWebSocket, message: string, description: string): void {
    try {
      ws.send(message, false, true);
    } catch (err: any) {
      log(
        `Closing connection during "${description}" for ${err.toString()}}`,
        "red"
      );

      try {
        ws.end(500, `{"error":"${description}"}`);
      } catch {}
    }
  }

  public listen(port: number): this {
    if (this.listening) throw new Error("App already listening!");

    this.app.listen(port, (listener) => {
      if (listener) {
        log(`${this.wsEndpoint} listening on port ${port}`, "green");
        this.listening = true;
      }
    });

    return this;
  }

  public async sendOfferToWebhook(
    offer: Offer,
    totalSubscribedClients: number,
    extraData?: StringObject
  ): Promise<void> {
    if (
      process.env.NODE_ENV === "webhook" &&
      !webhookIgnoredAsins.includes(offer.asin)
    ) {
      const embed: MessageBuilder = new MessageBuilder()
        .setTitle(offer.title ?? offer.asin)
        .setThumbnail(offer.imageURL!)
        .addField("Price", dollarFormatter.format(offer.price), true)
        .addField("Seller", offer.seller, true)
        .addField(
          "ATC",
          `[Click](https://www.amazon.com/gp/aws/cart/add.html?Quantity.1=1&OfferListingId.1=${offer.offeringID})`,
          true
        )
        .addField("ASIN", offer.asin, true)
        .addField("Seen at", offer.seenTimestamp.toString(), true)
        .addField(
          "Clients",
          `${totalSubscribedClients}/${this.totalClients}`,
          true
        )
        .addField("OfferId", "```\n" + offer.offeringID + "\n```")
        .setColor(16321662)
        /* eslint-disable */
        //@ts-ignore
        .setURL(`https://www.amazon.com/dp/${offer.asin}`);
      /* eslint-enable */

      if (extraData) {
        for (const [key, value] of Object.entries(extraData)) {
          embed.addField(key, value || "None");
        }
      }
      this.sendWebhook(embed, offer);
    }
  }

  private async sendToCloud(message: string): Promise<void> {
    for (let i = 0; i < this.cloudConnections.length; i++) {
      try {
        this.cloudConnections[i].send(message);
      } catch {
        log("Cloud instance disconnected (Couldnt send message)", "redBright");
        const deadId = this.cloudConnections[i].getUserData().uuid;
        this.cloudConnections = this.cloudConnections.filter(
          (socket) => socket.getUserData().uuid !== deadId
        );
      }
    }
  }

  private async processOffer(
    { offer, extraData }: PingerData,
    sendToWebhook: boolean = false
  ) {
    const formattedOffer = {
      instock: true,
      input: offer.asin,
      site: offer.site,
      ts: offer.seenTimestamp,
      extraData: {
        productString: offer.title || offer.asin,
        condition: offer.condition || true,
        price: offer.price,
        seller: offer.seller,
        offer: offer.offeringID,
        shipping: offer.shippingPrice,
        imageURL: offer.imageURL,
        marketplaceId: offer.marketplaceId,
      },
    };

    const stringified = JSON.stringify([formattedOffer]);

    if (
      offer.asin !== AmazonUStestAsin.asin &&
      offer.asin !== AmazonUKtestAsin.asin
    ) {
      this.sendToCloud(stringified);
    }

    const topic = productToTopic(offer.asin, offer.site);

    this.app.publish(topic, stringified);

    const totalSubscribedClients = this.app.numSubscribers(topic);

    log(
      `Sent an offer of ${offer.asin} to ${totalSubscribedClients}/${this.totalClients} clients`,
      "green"
    );

    if (sendToWebhook) {
      this.sendOfferToWebhook(offer, totalSubscribedClients, extraData).catch(
        console.error
      );
      //this.sendOfferToWebhook(offer, 0, extraData).catch(() => {});
    }
  }

  private isPinging(offer: Offer): boolean {
    return (
      this.pingers.findIndex(
        (pinger) =>
          pinger.offer.asin === offer.asin &&
          pinger.offer.site === offer.site &&
          pinger.active === true
      ) !== -1
    );
  }

  private getPinger(offer: Offer): Pinger {
    const foundPinger = this.pingers.find(
      (pinger) =>
        pinger.offer.asin === offer.asin && pinger.offer.site === offer.site
    );

    if (foundPinger !== undefined) return foundPinger;

    const pinger = {
      offer: offer,
      active: true,
    };
    this.pingers.push(pinger);

    return pinger;
  }

  private createPinger(data: PingerData): void {
    this.processOffer(data, true);

    const pinger = this.getPinger(data.offer);

    this.createNewPingInterval(data, pinger);

    const message = `Created a ${PING_INTERVAL}ms pinger for ${data.offer.asin} for ${CONSTANT_PING_TIMER}ms`;
    log(message, "green");
    this.sendWebhook(
      new MessageBuilder().setTitle(message).setColor(16321662),
      data.offer
    );
  }

  private createNewPingInterval(
    { offer, extraData }: PingerData,
    pinger: Pinger
  ): void {
    pinger.active = true;
    pinger.interval = setInterval(() => {
      offer.seenTimestamp = Date.now();
      this.processOffer({ offer, extraData });
    }, PING_INTERVAL);
    this.createNewPingTimeout(offer, pinger);
  }

  private createNewPingTimeout(offer: Offer, pinger: Pinger): void {
    setTimeout(() => {
      pinger.active = false;
      const embed = new MessageBuilder().setColor(14027061);
      let message = `Removed a pinger for ${offer.asin}`;
      if (pinger.interval) {
        clearInterval(pinger.interval);
      } else {
        message = "Pinger not found :(";
      }

      log(message, "red");
      this.sendWebhook(embed.setTitle(message), offer);
    }, CONSTANT_PING_TIMER);
  }

  public sendWebhook(embed: MessageBuilder, offer?: Offer): void {
    if (offer && webhookIgnoredAsins.includes(offer.asin)) return;
    this.webhook
      .send(
        embed
          .setFooter(`eStock Serverside`, "https://i.imgur.com/orK7ZxT.png")
          .setTimestamp()
      )
      .catch(console.error);
  }

  public offersNotify(message: InternalMessage): void {
    for (let i = 0; i < message.offers.length; i++) {
      if (webhookIgnoredAsins.includes(message.offers[i].asin)) {
        this.processOffer({
          offer: message.offers[i],
          extraData: message.extraData,
        });
        return;
      }
      //this.processOffer({ offer: message.offers[i], extraData: message.extraData }, true);
      if (this.isPinging(message.offers[i])) {
        return;
      }

      this.createPinger({
        offer: message.offers[i],
        extraData: message.extraData,
      });
    }
  }
}
