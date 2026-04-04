import { TLSInfo } from "../../types/etc";
const chromePresets = ["chrome62", "chrome70", "chrome72", "chrome83"];
const firefoxPresets = ["firefox55", "firefox56", "firefox63", "firefox65"];

const getRandom = <T>(arr: Array<T>): T => arr[Math.floor(Math.random() * arr.length)];

export const randomFirefox = (cookieString?: string): TLSInfo => {
  const preset = getRandom(firefoxPresets);
  //const useragent = useragents.firefox(preset.substr(preset.length - 2));
  const info: TLSInfo = {
    headers: [
      [
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
      ],
      ["Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"],
      ["Accept-Language", "en-US,en;q=0.5"],
      ["Accept-Encoding", "gzip, deflate, br"],
    ],
    preset: preset,
  };

  if (cookieString) info.headers.push(["Cookie", cookieString]);

  info.headers.push(["Upgrade-Insecure-Requests", "1"]);
  info.headers.push(["Cache-Control", "max-age=0"]);

  return info;
};

export const randomChrome = (cookieString?: string): TLSInfo => {
  const preset = getRandom(chromePresets);
  //const useragent = useragents.chrome(preset.substr(preset.length - 2));
  const info: TLSInfo = {
    headers: [
      ["Upgrade-Insecure-Requests", "1"],
      [
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
      ],
      [
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      ],
      ["Sec-GPC", "1"],
      ["Sec-Fetch-Site", "none"],
      ["Sec-Fetch-Mode", "navigate"],
      ["Sec-Fetch-User", "?1"],
      ["Sec-Fetch-Dest", "document"],
      ["Accept-Encoding", "gzip, deflate, br"],
      ["Accept-Language", "en-US,en;q=0.9"],
    ],
    preset: preset,
  };

  if (cookieString) info.headers.push(["Cookie", cookieString]);

  return info;
};

export const randomTLS = (cookieString?: string): TLSInfo => {
  return Math.random() > 0.5 ? randomChrome(cookieString) : randomFirefox(cookieString);
};
