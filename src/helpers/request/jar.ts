/* eslint-disable */
const tough = require("tough-cookie");

export default class CookieJar {
  private cookies: any;
  constructor() {
    this.cookies = {};
  }

  setCookieSync(cookieString: any) {
    const cookie = tough.parse(cookieString);

    this.cookies[cookie.key] = cookie;
  }

  updateCookies() {
    for (const cookieName in this.cookies) {
      const cookie = this.cookies[cookieName];
      let expired = false;

      if (cookie.expires != "Infinity") expired = cookie.expired.getTime() < Date.now();
    }
  }

  getCookieStringSync() {
    let cookieString = "";

    for (const cookieName in this.cookies) {
      cookieString += `${cookieName}=${this.cookies[cookieName].value}; `;
    }
    return cookieString;
  }

  setCookieValue(key: any, value: any) {
    if (this.cookies[key]) {
      this.cookies[key].value = value;
    } else {
      this.setCookieSync(`${key}=${value}`);
    }
  }

  getCookie(key: any) {
    return this.cookies[key];
  }

  getCookieValue(key: any) {
    if (!this.cookies[key]) return null;
    return this.cookies[key].value;
  }
}
