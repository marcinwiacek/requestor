'use strict';

const https = require('https');

let templates = [];

function addTemplate(name, value) {
    templates[name] = value;
}

addTemplate("google", "https://www.google.com/search?q=")
addTemplate("duck", "https://duckduckgo.com/?q=")

let steps = [];

const stepName = {
    ForEach: 1,
    RequestHTTP1: 2
}

function addStep(id, name, parent, value1, value2, value3, value4) {
    let arr = []
    arr["id"] = id
    arr["name"] = name
    arr["parent"] = parent
    arr["value1"] = value1
    arr["value2"] = value2
    arr["value3"] = value3
    arr["value4"] = value4
    steps[name] = arr
}

addStep(stepName.ForEach, "1", "", "engine,word\n${google},test\n${duck},test", "", "", "");
addStep(stepName.RequestHTTP1, "2", "1", "GET", "${engine}${word}", "", "");

function rep(str, arr) {
    let reg = /\${(.+?)}/;
    let m = str;
    while (true) {
        let m0 = reg.exec(m);
        if (m0 == null) break;
        console.log("replacing " + m0[1]);
        if (arr[m0[1]]) {
            m = m.replace(m0[0], arr[m0[1]]);
        } else if (templates[m0[1]]) {
            m = m.replace(m0[0], templates[m0[1]]);
        } else {
            console.log("cannot find template " + m0[1]);
            break;
        }
        console.log("after replacing " + m);
    }
    return m;
}

 function request(url) {
    return new Promise((resolve, reject) => {
        console.log("start");
        https.get(url, (response) => {
            let chunks_of_data = [];

            response.on('data', (fragments) => {
                chunks_of_data.push(fragments);
            });

            response.on('end', () => {
                let response_body = Buffer.concat(chunks_of_data);
                console.log("end");
                console.log(response_body.toString());
                resolve(response_body.toString());
            });

            response.on('error', (error) => {
                console.log(error);
                reject(error);
            });
        });
    });
}

function resolveAfter2Seconds(x) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x);
    }, 2000);
  });
}

async function req2(url) {
    try {
console.log("start");
        // http_promise is a Promise
        // "response_body" will hold the response if the Promise is resolved 
//        let response_body = await request(url);
var x = await resolveAfter2Seconds(10);
console.log("end");
    } catch (e) {
        // if the Promise is rejected
        console.error(e);
    }

}

async function executeStep(name, parentname, arr) {
                console.log("execute step " + name);
for (let index in steps) {
let t = steps[index];
                    if (name == t["name"] ||
                    parentname == t["parent"]) {
                        switch (t["id"]) {
                            case stepName.ForEach:
                                console.log(t["value1"]);
                                let lines = t["value1"].split("\n");
                                let headers = []
                                console.log(lines[0].split(","));
                                lines.forEach(function(l) {
                                    if (headers.length == 0) {
                                        headers = l.split(",");
                                    } else {
                                        let ll = l.split(",");
                                        let i = 0;
                                        let arra = [];
                                        headers.forEach(function(h) {
                                            console.log(h + " " + ll[i]);
                                            arra[h] = ll[i];
                                            i++;
                                        });
                                        console.log(arra);
                                        executeStep("-",t["name"], arra);
                                    }
                                });
                                break;
                            case stepName.RequestHTTP1:
                                console.log(rep(t["value2"], arr));
                                console.log(rep(t["value3"], arr));
                                console.log(rep(t["value4"], arr));
                                req2(rep(t["value2"], arr));

                                break;
                        }
                    }
            }
        }


     executeStep("1", "-", null);