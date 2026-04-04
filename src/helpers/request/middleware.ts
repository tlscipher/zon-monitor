/* eslint-disable */
const path = require("path");

module.exports.init = function () {
  if ((global as any).proteusTLSMiddleware) {
    return (global as any).proteusTLSMiddleware; //init allready done
  }

  const platforms: any = {
    win32: {
      lib: "windows.dll",
      binding: "windows",
    },
    darwin: {
      lib: "darwin.dylib",
      binding: "darwin",
    },
    linux: {
      lib: "linux.so",
      binding: "linux",
    },
  };

  if (!platforms[process.platform]) throw "unsupported platform " + process.platform;

  const bindingPath = path.join(__dirname, `./tls/${platforms[process.platform].binding}.node`);
  // var binding = require(bindingPath)
  if (__filename.includes(".js")) {
    var binding = require(`../../../../tls/${platforms[process.platform].binding}.node`);

    var res = JSON.parse(
      binding.loadLib(
        path.join(__dirname, "..", "..", "..", "..", "tls", platforms[process.platform].lib)
      )
    );
  } else {
    var binding = require(`../../../tls/${platforms[process.platform].binding}.node`);

    var res = JSON.parse(
      binding.loadLib(
        path.join(__dirname, "..", "..", "..", "tls", platforms[process.platform].lib)
      )
    );
  }

  if (!res.Success) throw "load lib error: " + res.Error;
  (global as any).proteusTLSMiddleware = class NAPIMiddleware {
    static initClient(config: any) {
      return new Promise((resolve, reject) => {
        binding.initClient(JSON.stringify(config), (err: any, response: any) => {
          if (err) reject(err);
          else {
            res = JSON.parse(response);
            if (res.Error) reject(res.Error);
            else resolve(res);
          }
        });
      });
    }

    static request(config: any) {
      return new Promise((resolve, reject) => {
        binding.request(JSON.stringify(config), (err: any, response: any) => {
          if (err) reject(err);
          else {
            const res = JSON.parse(response);
            if (res.Error) reject(res.Error);
            else resolve(res);
          }
        });
      });
    }
  };

  return (global as any).proteusTLSMiddleware;
};
