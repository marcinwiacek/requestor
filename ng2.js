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
            let chunks_of_data = [];

            response.on('data', (fragments) => {
                chunks_of_data.push(fragments);
            });

            response.on('end', () => {
                let response_body = Buffer.concat(chunks_of_data);
                //			console.log(response.headers);
                resolve(response_body.toString());
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
    });
}

async function executetestcase(arr, data) {
    console.log(arr.name);
    console.log(arr.testsuite[0].name);

    for (let tsnumber in arr.testsuite) {
        console.log("testsuite name " + arr.testsuite[tsnumber].name);
        for (let tcnumber in arr.testsuite[tsnumber].testcase) {
            console.log("testcase name " + arr.testsuite[tsnumber].testcase[tcnumber].name);
            let lines = arr.testsuite[tsnumber].testcase[tcnumber].input;
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
                    for (let stepnumber in arr.testsuite[tsnumber].testcase[tcnumber].step) {
                        console.log("step name " + arr.testsuite[tsnumber].testcase[tcnumber].step[stepnumber].name);
                        var stepcopy = JSON.parse(JSON.stringify(arr.testsuite[tsnumber].testcase[tcnumber].step[stepnumber]));
                        if (stepcopy.function != null) {
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
        addToLog("<url>" + req.url + "</url>\n");
        addToLog("<headers>" + req.headers + "</headers>\n");
        addToLog("<body><!CDATA[" + req.content + "]]></body>\n");
        console.log("start");
        var response_body = await executeRequest(req);
        addToLog("<response>\n");
        addToLog("<!CDATA[" + response_body + "]]>");
        addToLog("</response>\n");
        console.log("end");
        addToLog("</request>\n");
    } catch (e) {
        console.error(e);
    }
}

executetestcase(jsonObj.project, []);