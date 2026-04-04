import {getProducts} from "./helpers/products";

require("dotenv").config();
import path from "path";
import AppManager from "./helpers/AppManager";
import {getProxiesFromPath} from "./helpers/etc/Proxies";
import MonitorHandler from "./helpers/MonitorHandler";
import {Proxy} from "./types/etc";
import {Client, Intents} from "discord.js";
import {getProductImage, MarketplaceId} from "./helpers/etc/utls";
import {AmazonProduct, Product} from "./types/amazon";
//import { PrismaClient } from "@prisma/client";

(async function () {
    const port = (process.env.PORT && parseInt(process.env.PORT)) || 4300;

    const allowedUsers = [
        "373940394272096257",
        "527562989898039296",
        "84747527227703296",
        "630545390785265674",
        "464495113717153804",
        "308277721677430787",
        "414180306409750531",
        "324228574850711552",
        "946096976250933278",
    ];

    const client = new Client({
        ws: {
            intents:
                Object.values(Intents.FLAGS).reduce((acc, p) => acc | p, 0) &
                ~(Intents.FLAGS.GUILD_MEMBERS | Intents.FLAGS.GUILD_PRESENCES),
        },
    });

    const dataPath = path.join(__dirname, "..", "data");

  //const USProductsPath = path.join(dataPath, "USProducts.json");
  //const USProducts2Path = path.join(dataPath, "USProducts2.json");

  //const UKProductsPath = path.join(dataPath, "UKProducts.json");

    type StoredProduct = { asin: string; title: string };

    let USProducts: AmazonProduct[] = await getProducts();

  //const USProducts2 = require(USProducts2Path);

  //const combinedUSProducts = USProducts

    const filteredFormatted = USProducts
        .filter(({asin, title}: StoredProduct, index: number) => {
            return (
                USProducts.findIndex(
                    (prod: StoredProduct) => prod.asin === asin
                ) === index
            );
        })
        .map(
            ({asin, title}: StoredProduct): Product => ({
                asin,
                title,
                imageURL: getProductImage(asin),
            })
        );

    // Will only give out US products
    const appManager = new AppManager(filteredFormatted).listen(port);

  //const AmazonUS2Path = path.join(__dirname, "monitors", "AmazonUS2.js");
    const AmazonUSBatchedPath = path.join(
        __dirname,
        "monitors",
        "AmazonUSBatched.js"
    );

    /*const AmazonUKBatchedPath = path.join(
      __dirname,
      "monitors",
      "AmazonUKBatched.js"
    );*/

    const proxies: Proxy[] = getProxiesFromPath(
        "http",
        path.join(dataPath, "proxies.txt")
    );

    const AccountsPath = path.join(dataPath, "accounts.json");

    /*const AmazonUS2Handler = new MonitorHandler(
      AmazonUS2Path,
      USProducts2Path,
      AccountsPath,
      "amazonUS",
      proxies
    );*/

    const AmazonUSBatchedHandler = new MonitorHandler(
        AmazonUSBatchedPath,
        AccountsPath,
        "amazonUS",
        proxies
    );

    /*const AmazonUKBatchedHandler = new MonitorHandler(
      AmazonUKBatchedPath,
      UKProductsPath,
      AccountsPath,
      "amazonUK",
      proxies
    );*/

    AmazonUSBatchedHandler.on(
        "new-offers",
        appManager.offersNotify.bind(appManager)
    );

//AmazonUS2Handler.on("new-offers", appManager.offersNotify.bind(appManager));

    /*AmazonUKBatchedHandler.on(
      "new-offers",
      appManager.offersNotify.bind(appManager)
    );*/

    client.on("message", (message) => {
        if (!message.content.toLowerCase().startsWith("!send")) return;
        if (!allowedUsers.includes(message.author.id))
            return message.reply("Not allowed");

        console.log("Processing " + message.content);

        const [command, asin, offeringID, marketplace, ..._] =
            message.content.split(" ");

        const marketplaceId =
            marketplace?.toLowerCase() === "uk" ? MarketplaceId.UK : MarketplaceId.US;

        if (!asin || !offeringID) return message.reply("Invalid usage");

        appManager.offersNotify({
            offers: [
                {
                    asin,
                    condition: true,
                    marketplaceId: marketplaceId,
                    offeringID,
                    price: 0,
                    seenTimestamp: Date.now(),
                    seller:
                        marketplaceId === MarketplaceId.UK ? "Amazon.co.uk" : "Amazon.com",
                    shippingPrice: 0,
                    site: marketplaceId === MarketplaceId.UK ? "amazonUK" : "amazonUS",
                    title: asin,
                },
            ],
        });

        message.reply(`Broadcasted \`${asin}\` \`${offeringID}\``);
    });


})()

