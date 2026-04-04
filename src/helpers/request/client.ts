/* eslint-disable */
import { Headers } from "./headers";
const middleware = require("./middleware").init();

// import {init} from './middleware'
// const Headers = require('./headers')
export const Jar = require("./jar");
// import { CookieJar } from './jar'

const tough = require("tough-cookie");
const { v4: uuidv4 } = require("uuid");

const requiredPseudoHeaders = ["method", "path", "scheme", "authority"];

export interface Client {
  id: any;
  disabled: any;
  type: any;
  config: any;
}

export class Client {
  async init(config: any) {
    const _config = Object.assign({}, config);

    if (!this.id) this.id = uuidv4();

    _config.Id = this.id;

    const res = await middleware.initClient(_config);

    if (res.Error) throw "Error initalizing client:" + res.Error;
  }

  cancelRequests() {
    return middleware.cancelRequests(this.id);
  }

  disable() {
    this.disabled = true;
  }

  async request(config: any) {
    if (this.disabled) return;

    //Config validation
    if (!config.url) throw `"url" argument is required`;

    //Defaults
    const _config: any = {
      headers: [],
      resolveWithFullResponse: true,
      simple: false,
      id: this.id,
    };

    //Configuration merging
    for (const key in config) {
      switch (key) {
        case "headers":
          if (Array.isArray(config.headers)) _config.headers = config.headers.concat([]);
          else if (typeof _config.headers == "object")
            _config["headers"] = Headers.transformHeadersToArray(_config.headers);
          break;

        case "body":
          _config.body = config.body;
          break;

        case "form":
          _config.body = [];

          for (const formKey in config.form) {
            _config.body.push(
              encodeURIComponent(formKey) + "=" + encodeURIComponent(config.form[formKey])
            );
          }
          _config.body = _config.body.join("&");

          if (!Headers.headerContains(_config.headers, "content-type"))
            _config.headers.push(["content-type", "application/x-www-form-urlencoded"]);
          break;

        case "json":
          _config.body = JSON.stringify(config.json);

          if (!Headers.headerContains(_config.headers, "content-type"))
            _config.headers.push(["content-type", "application/json"]);
          break;

        case "jar":
          _config.jar = config.jar;
          break;

        case "pseudoHeaderOrder":
          for (let i = 0; i < requiredPseudoHeaders.length; i++) {
            if (!config.pseudoHeaderOrder.includes(requiredPseudoHeaders[i]))
              throw "missing pseudo header " + requiredPseudoHeaders[i];
          }
          _config.pseudoHeaderOrder = config.pseudoHeaderOrder;
          break;
        default:
          _config[key] = config[key];
          break;
      }
    }

    if (_config.jar) {
      //check if we have to add the cookies of the jar to an existing cookie header
      if (Headers.headerContains(_config.headers, "cookie")) {
        for (let i = 0; i < _config.headers.length; i++) {
          if (_config.headers[i][0].toLowerCase() == "cookie") {
            _config.headers[i][1] += " ;" + _config.jar.getCookieStringSync(_config.url);
            break;
          }
        }
      } else {
        _config.headers.push(["cookie", _config.jar.getCookieStringSync(_config.url)]);
      }
    }
    _config["Headers"] = _config.headers;

    const rawResponse = await middleware.request(_config);

    if (rawResponse.Error) throw "Http-Client Error: " + rawResponse.Error;

    if (_config.parseJson) {
      rawResponse.Body = JSON.parse(rawResponse.Body);
    }

    const response: any = {
      body: rawResponse.Body,
      headers: new Headers(rawResponse["Headers"]),
      statusCode: rawResponse.Status,
    };

    if (response.headers.has("set-cookie") && _config.jar) {
      for (const cookieEntry of response.headers.get("set-cookie")) {
        _config.jar.setCookieSync(cookieEntry, _config.url);
      }
    }

    //Staus code handling
    if (_config.simple) {
      if (response.Status > 299 || config.Status < 200)
        throw `Status Code Error(${response.Status}) - ${response.Body}`;
    }

    // Return values
    if (_config.resolveWithFullResponse) {
      return response;
    } else {
      return response.body;
    }
  }
}
