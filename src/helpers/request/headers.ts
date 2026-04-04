/* eslint-disable */
export interface Headers {
  rawHeaders: any;
  headers: any;
}

export class Headers {
  constructor(rawHeaders: any) {
    this.rawHeaders = rawHeaders;
    this.headers = {};

    for (const headerName in rawHeaders)
      this.headers[headerName.toLowerCase()] = rawHeaders[headerName];
  }

  get(name: any) {
    return this.headers[name.toLowerCase()];
  }

  has(name: any) {
    return this.headers.hasOwnProperty(name.toLowerCase());
  }

  static transformHeadersToArray(rawHeaders: any) {
    const outHeaders = [];

    for (const headerName in rawHeaders) {
      outHeaders.push([headerName, rawHeaders[headerName]]);
    }

    return outHeaders;
  }

  static headerContains(headers: any, key: any) {
    for (const headerEntry of headers) {
      if (headerEntry[0].toLowerCase == key.toLowerCase()) return true;
    }

    return false;
  }
}
