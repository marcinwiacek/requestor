//formatted with js-beautify -e "\n" ng1.js > x

const fs = require('fs');
const http = require('http');
const https = require('https');
//const http2 = require('http2');
const path = require('path');
const url = require('url');

var x = fs.readFileSync(path.normalize(__dirname + "/bela3.json"), 'utf8');
x = x.charCodeAt(0) == 65279 ? x.substring(1) : x;
let jsonObj = JSON.parse(x)

async function executeRequest(req) {
    console.log(req);
    console.log("request " + JSON.stringify(req));
    var q = url.parse(req.url, true);
    console.log("url " + JSON.stringify(q));
    const options = {
        //	hostname:q.hostname,
        //	port:443,
        //	path:q.path,
        //        method:req.method
        //        req.headers
    };
    console.log(options);

    var method = null;
    if (q.protocol == "http:") {
        if (req.type == "get") method = http.get;
        if (req.type == "post") method = http.post;
    } else if (q.protocol == "https:") {
        if (req.type == "get") method = https.get;
        if (req.type == "post") method = https.post;
    }

    return new Promise((resolve, reject) => {
        method(req.url, (response) => {
            let chunks = [];

            response.on('data', (fragments) => {
                chunks.push(fragments);
            });

            response.on('end', () => {
                var resp = {}
                resp.body = Buffer.concat(chunks).toString();
                resp.headers = response.headers;
                resp.code = response.statusCode;
                resolve(resp);
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
    });
}

async function executetestcase(arr, data) {
    for (let tsnumber in arr.testsuites) {
        console.log("testsuite name " + arr.testsuites[tsnumber].name);
        for (let tcnumber in arr.testsuites[tsnumber].testcases) {
            console.log("testcase name " + arr.testsuites[tsnumber].testcases[tcnumber].name);
            let lines = arr.testsuites[tsnumber].testcases[tcnumber].input;
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
                    for (let stepnumber in arr.testsuites[tsnumber].testcases[tcnumber].steps) {
                        console.log("step name " + arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].name);
                        var stepcopy = JSON.parse(JSON.stringify(arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber]));
                        if (stepcopy.function != null) {
                            for (let servicenumber in arr.services) {
                                console.log("service name " + arr.services[servicenumber].name);
                                for (let functionnumber in arr.services[servicenumber].functions) {
                                    console.log("function name " + arr.services[servicenumber].functions[functionnumber].name);
                                    if (arr.services[servicenumber].functions[functionnumber].name == stepcopy.function) {
                                        stepcopy = JSON.parse(JSON.stringify(arr.services[servicenumber].functions[functionnumber]));
                                        stepcopy.url = arr.services[servicenumber].url + stepcopy.url;
                                    }
                                }

                            }
                        } else {
                            continue;
                        }

                        for (let d in arra) {
                            console.log(d);
                            console.log(arra[d]);
                            stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                        }
                        await request2(stepcopy);
                    }
                }
            };
        }
    }
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
        addToLog("  <url>" + req.url + "</url>\n");
        for (let headername in req.headers) {
            addToLog("  <header>" + req.headers[headername] + "</header>\n");
        }
        addToLog("  <body>\n");
        addToLog("  <![CDATA[\n" + req.content.replace("]]>", "]]]]><![CDATA[>") + "\n]]>\n");
        addToLog("  </body>\n");
        console.log("start");
        var response = await executeRequest(req);
        for (let headername in response.headers) {
            addToLog("  <response_header>" + headername + ": " + response.headers[headername] + "</response_header>\n");
        }
        addToLog("  <response_code>" + response.code + "</response_code>\n");
        addToLog("  <response_body>\n");
        addToLog("  <![CDATA[\n" + response.body.replace("]]>", "]]]]><![CDATA[>") + "\n]]>\n");
        addToLog("  </response_body>\n");
        console.log("end");
        addToLog("</request>\n");
    } catch (e) {
        console.error(e);
    }
}

executetestcase(jsonObj.project, []);