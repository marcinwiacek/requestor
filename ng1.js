const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const url = require('url');

var x = fs.readFileSync(path.normalize(__dirname + "/bela3.json"), 'utf8');
x = x.charCodeAt(0) == 65279 ? x.substring(1) : x;
let json = JSON.parse(x)
console.log(JSON.stringify(json,null,2));

console.log (json.project.name);
console.log (json.project.testsuite[0].name);

for (let tsnumber in json.project.testsuite) {
  console.log("testsuite name "+json.project.testsuite[tsnumber].name);
  for (let tcnumber in json.project.testsuite[tsnumber].testcase) {
    console.log("testcase name "+json.project.testsuite[tsnumber].testcase[tcnumber].name);
    for (let stepnumber in json.project.testsuite[tsnumber].testcase[tcnumber].step) {
      console.log("step name "+json.project.testsuite[tsnumber].testcase[tcnumber].step[stepnumber].name);
    }
  }
}


/*
let requestTemplates = []

function request(req) {
    console.log("request " + JSON.stringify(req));
    var q = url.parse(req.url, true);
    console.log("url " + JSON.stringify(q));
    //	if (q.protocol=="https") q.port2 = "443";
    //	if (q.protocol=="http") q.port2 = "80";

    const options = {
        //	hostname:q.hostname,
        //	port:443,
        //	path:q.path,
        //        method:req.method
        //        req.headers
    };
    console.log(options);

    return new Promise((resolve, reject) => {
        switch (req.requestType) {
            case "http1get":
                http.get(req.url, (response) => {
                    let chunks_of_data = [];

                    response.on('data', (fragments) => {
                        chunks_of_data.push(fragments);
                    });

                    response.on('end', () => {
                        let response_body = Buffer.concat(chunks_of_data);
                        resolve(response_body.toString());
                    });

                    response.on('error', (error) => {
                        reject(error);
                    });
                });
                break;
            case "http1post":
                http.get(req.url, (response) => {
                    let chunks_of_data = [];

                    response.on('data', (fragments) => {
                        chunks_of_data.push(fragments);
                    });

                    response.on('end', () => {
                        let response_body = Buffer.concat(chunks_of_data);
                        resolve(response_body.toString());
                    });

                    response.on('error', (error) => {
                        reject(error);
                    });
                });
                break;
            case "https1get":
                https.get(req.url, (response) => {
                    let chunks_of_data = [];

                    response.on('data', (fragments) => {
                        chunks_of_data.push(fragments);
                    });

                    response.on('end', () => {
                        let response_body = Buffer.concat(chunks_of_data);
                        resolve(response_body.toString());
                    });

                    response.on('error', (error) => {
                        reject(error);
                    });
                });
                break;
            case "https1post":
                https.get(req.url, (response) => {
                    let chunks_of_data = [];

                    response.on('data', (fragments) => {
                        chunks_of_data.push(fragments);
                    });

                    response.on('end', () => {
                        let response_body = Buffer.concat(chunks_of_data);
                        resolve(response_body.toString());
                    });

                    response.on('error', (error) => {
                        reject(error);
                    });
                });
                break;
        }
    });
}

function addToLog(str) {
//<?xml version="1.0" encoding="utf-8"?>
    fs.writeFileSync(path.normalize(__dirname + "/bela2log.xml"), str, {
        "flag": "a"
    });
}

async function request2(req) {
    console.log("request " + JSON.stringify(req));
    try {
        addToLog("<request>\n");
        addToLog("<url>" + req.url + "</url>\n");
        addToLog("<headers>" + req.headers + "</headers>\n");
        addToLog("<body><!CDATA[" + req.content + "]]></body>\n");
        console.log("start");
        var response_body = await request(req);
        addToLog("<response>\n");
        addToLog("<!CDATA["+response_body+"]]>");
        addToLog("</response>\n");
        console.log("end");
        addToLog("</request>\n");
    } catch (e) {
        console.error(e);
    }
}

function rep(str, data) {
    while (str.indexOf("{{") != -1) {
        const template = Handlebars.compile(str);
        const x = template(data);
        if (x == str) break;
        str = x;
    }
    return str;
}

async function execute(arr, data) {
    console.log("starting");
    for (index in arr.step) {
        let s = arr.type === undefined ? arr.step[index] : arr.step;
        console.log(s.type);
        if (s.type == "requestTemplate") {
            let step = [];
            step.step = s;
            requestTemplates = Object.assign({}, requestTemplates, step);
        } else if (s.type == "forEach") {
            let lines = s.data.split("\n");
            let headers = []
            for (let index2 in lines) {
                let l = lines[index2];
                if (headers.length == 0) {
                    headers = l.split(",");
                } else {
                    let ll = l.split(",");
                    let i = 0;
                    let arra = [];
                    headers.forEach(function(h) {
                        arra[h] = ll[i];
                        i++;
                    });
                    console.log(arra);
                    await execute(s, arra);
                }
            };
        } else if (s.type == "request") {
            if (s.template === undefined) {
                var req = {};
                req.requestType = s.requestType;
                req.data = Object.assign({}, data, JSON.parse(s.data));
                req.content = rep(s.content, req.data);
                req.url = encodeURI(rep(s.url, req.data));
                req.headers = rep(s.headers, req.data);
//                req.method = "GET";
                console.log("request " + JSON.stringify(req));

                await request2(req);
            } else {
                for (let index2 in requestTemplates) {
                    let l = requestTemplates[index2];
                    if (l.name == s.template) {
                        var req = {};
                        req.requestType = l.requestType;
                        req.data = Object.assign({}, JSON.parse(l.data), data, JSON.parse(s.data));
                        req.content = rep(l.content, req.data);
                        req.url = rep(l.url, req.data);
                        req.headers = rep(l.headers, req.data);
//                        req.method = "GET";
                        console.log("request " + JSON.stringify(l));
                        console.log("request " + JSON.stringify(req));

                        await request2(req);
                    }
                }

            }
        }
        if (arr.type === undefined) {} else {
            break;
        }
    }
}

execute(jsonObj.project, []);
*/
