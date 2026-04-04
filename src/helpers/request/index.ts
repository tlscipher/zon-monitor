// const Client = require("./client.js")
// //const toughCookie = require("tough-cookie");
// //const got = require("got")
// var counter = 0;

// class Monitor{
//     constructor(asin){
//         this.asin = asin
//         //this.cookieJar = new toughCookie.CookieJar();
//     }

//     async monitor(){
//         var client = new Client()
//         client.init({
//             type: 'preset',
//             preset: 'chrome83',
//             timeout: 10 * 1000,
//            // proxy:"http://127.0.0.1:8888"
//         });

//         while (true) {
//             counter++;
//             let res = await client.request({
//                 url:"https://passionfruit.solutions/",
//                 method:"GET",
//                 headers:[
//                     ["accept-encoding", "gzip, deflate, br"]
//                  ],
//                 //jar:this.cookieJar
//             });
//             //await got("https://passionfruit.solutions/")
//         }
//     }
// }

// setInterval(() => {
//     console.log(counter+" requests per second")
//     counter = 0;
// }, 1000);

// for (let i = 0; i < 100; i++) {
//     let m = new Monitor(i);
//     m.monitor();
// }
