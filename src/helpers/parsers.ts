import { InternalProduct, Site } from "../types/etc";
import { Offer } from "../types/amazon";
import { AxiosResponse } from "axios";
import { getProductImage, MarketplaceId } from "./etc/utls";
//import fs from "fs";

export const productPage = <siteName extends Site = Site>(
  resp: AxiosResponse,
  product: InternalProduct,
  site: siteName,
  marketplaceId: MarketplaceId
): Offer => {
  const seenTimestamp = Date.now();

  return {
    seller: "Amazon",
    condition: true,
    shippingPrice: 0,
    site,
    asin: product.asin,
    seenTimestamp,
    offeringID: resp.data.offerId,
    title: product.title ?? product.asin,
    price: 0,
    imageURL: getProductImage(product.asin),
    marketplaceId,
  };
};

export const productToOffer = <siteName extends Site = Site>(
  product: InternalProduct,
  site: siteName,
  marketplaceId: MarketplaceId,
  overrideOfferId?: string
): Offer => {
  const seenTimestamp = Date.now();

  return {
    seller: "Amazon",
    condition: true,
    shippingPrice: 0,
    site,
    asin: product.asin,
    seenTimestamp,
    offeringID: overrideOfferId ?? product.offeringID,
    title: product.title ?? product.asin,
    price: 0,
    imageURL: getProductImage(product.asin),
    marketplaceId,
  };
};

/*
export const sellerOfferListings = <siteName extends Site = Site>(
  asin: string,
  offeringID: string,
  html: string,
  site: siteName
): Offer[] => {
  const parsed = JSON.parse(html);
  if (parsed.cache !== null) log("Cached: " + parsed.cache.toString(), "red");
  for (const row of parsed.listRows) {
    if (row.rowBadges !== null && row.rowHeader !== null && row.rowBody !== null) {
      const seller: string =
        row.rowHeader.leftMultiLineTextFields.textFieldRows[1].textFields[0].value;

      // If seller != amazon
      if (seller !== "Amazon.com") continue;

      const condition: string =
        row.rowHeader.leftMultiLineTextFields.textFieldRows[0].textFields[0].value;

      const price = parseFloat(
        row.rowHeader.rightMultiLineTextFields.textFieldRows[0].textFields[0].value
          .trim()
          .replace(",", "")
          .replace("$", "")
      );

      return [
        {
          asin,
          imageURL: `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN=${asin}&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=_SL250_`,
          site,
          price,
          shippingPrice: 0,
          condition: condition.trim().includes("new"),
          offeringID,
          seller,
        },
      ];
    }
  }

  return [];
};

*/

/*
export const atc = <siteName extends Site = Site>(
  html: string,
  products: InternalProduct[],
  site: siteName
): Offer[] => {
  const seenTimestamp = Date.now();
  const parsedOffers: Offer[] = [];
  const root = parseHTML(html);

  const [_, ...offers] = root.querySelectorAll("tr");

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    const [imageRow, titleRow, priceRow] = offer.querySelectorAll(".item-row");

    const imageURL = (imageRow.childNodes[0] as any).childNodes[0].getAttribute("src")!;
    const asin = (imageRow.childNodes[0] as any).getAttribute("href")!.split("product/")[1];
    const title = titleRow.innerText;
    const price = parseFloat(priceRow.innerText.replace(/[^0-9.]/g, ""));
    const offeringID = products.find((prod) => prod.asin === asin)?.offeringID; //offer.nextElementSibling!.getAttribute("value")!;

    if (typeof offeringID !== "string") {
      throw new Error("Invalid or blank offeringID in parser for " + asin);
    }

    parsedOffers.push({
      seller: "Amazon",
      condition: true,
      shippingPrice: 0,
      site,
      asin,
      seenTimestamp,
      offeringID,
      title,
      price,
      imageURL,
    });
  }

  return parsedOffers;
};

/*
export const buyNow = <siteName extends Site = Site>(
  asin: string,
  offeringID: string,
  html: string,
  site: siteName
): Offer[] => {
  const parsedOffers: Offer[] = [];
  const root = parseHTML(html);

  const images = root.querySelectorAll("img");
  const imageURL = images[0].getAttribute("src");
  var price = parseFloat(
    root.querySelector(".a-color-price").innerText.trim().replace(",", "").replace("$", "")
  );
  price = +(price < 25 ? price * 0.73 : price * 0.9).toFixed(2);

  const seller = html.includes('a-color-link">AmazonSmile') ? "Amazon" : "Unknown";
  parsedOffers.push({
    title: asin,
    imageURL,
    asin,
    site,
    price,
    shippingPrice: 0,
    condition: true,
    offeringID,
    seller,
  });

  return parsedOffers;
};

/*
const ajaxSelectors = {
  title: "#aod-asin-title-text",
  imageURL: "#aod-asin-image-id",
  offers: "#aod-offer, #aod-pinned-offer",
  offeringID: 'input[name="offeringID1"]',
  price: ".a-offscreen",
  submit: 'input[name="submitaddToCart"]',
  condition: "#aod-offer-heading",
  delivery: "#delivery-message, #ddmDeliveryMessage",
};

const ajaxDeliveryRegex = /\$\d+.\d+/;
const ajaxPriceRegex = /\d+[,\.\d]+/;

export const ajax = (asin: string, html: string, site: Site): Offer[] => {
  html = html.replace(/offeringID\./g, "offeringID").replace(/submit\.addToCart/g, "submitaddToCart");

  const parsedOffers: Offer[] = [];
  const root = parse(html);

  const offers = root.querySelectorAll(ajaxSelectors.offers);

  const titleElement = root.querySelector(ajaxSelectors.title);
  const title = titleElement ? titleElement.innerText.trim() : undefined;

  const imageElement = root.querySelector(ajaxSelectors.imageURL);
  const imageURL = imageElement && imageElement.attributes.src ? imageElement.attributes.src : undefined;

  for (const offer of offers) {
    const offeringElement = offer.querySelector(ajaxSelectors.offeringID);

    if (!offeringElement) {
      //console.log("No offeringID for an offer " + asin + " (Blank pinned?)");
      continue;
    }

    const submitElement = offer.querySelector(ajaxSelectors.submit);
    const priceElement = offer.querySelector(ajaxSelectors.price);
    const conditionElement = offer.querySelector(ajaxSelectors.condition);
    const deliveryElement = offer.querySelectorAll(ajaxSelectors.condition)[0];

    var delivery:any = delivery ? ajaxDeliveryRegex.exec(deliveryElement.innerText) : undefined;

    const offeringID = offeringElement.attributes.value;
    const shippingPrice = delivery ? parseFloat(delivery[0].substring(1).replaceAll(",", "")) : 0.0;
    const seller = submitElement.attributes["aria-label"].split("seller")[1].split("and")[0].trim();
    const condition = conditionElement ? conditionElement.innerText.trim().toLowerCase() == "new" : true;
    //@ts-ignore
    const price = parseFloat(ajaxPriceRegex.exec(priceElement.innerText)[0].replace(/\,/, ""));

    parsedOffers.push({
      title,
      imageURL,
      asin,
      site,
      price,
      shippingPrice,
      condition,
      offeringID,
      seller,
    });
  }

  return parsedOffers;
};

export const refresh = (asin: string, html: string, site: Site): Offer[] => {
  const offeringID = html.split('name=\\"offerListingID\\" value=\\"')[1].split("\\")[0];

  var price;

  try {
    price = parseFloat(
      html
        .split('"a-size-medium a-color-price\\">\\n')[1]
        .split("\\")[0]
        .replace(/[^0-9.]/g, "")
    );
  } catch {
    price = parseFloat(
      html
        .split('"a-size-medium a-color-price priceBlockBuyingPriceString\\">')[1]
        .split("<")[0]
        .replace(/[^0-9.]/g, "")
    );
  }

  const mainOffer: Offer = {
    asin,
    price,
    shippingPrice: 0,
    site,
    seller: "Amazon.com",
    condition: true,
    offeringID,
  };
  return [mainOffer];
};
*/
