//formatted with js-beautify -e "\n" ng1.js > x

const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const url = require('url');
const zlib = require('zlib');
const child_process = require('child_process');

const hostname = '127.0.0.1';
const port = 3000;

function readFileContentSync(fileName, callback) {
    //FIXME: checking if path is going out
    if (callback) {
        fs.readFile(path.normalize(__dirname + fileName), 'utf8', (err, data) => {
            if (err) {
                callback("");
            } else if (data.charCodeAt(0) == 65279) {
                callback(data.substring(1));
            } else {
                callback(data);
            }
        });
    } else {
        const x = fs.readFileSync(path.normalize(__dirname + fileName), 'utf8');
        return (x.charCodeAt(0) == 65279) ? x.substring(1) : x;
    }
}

var all_responses = []

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
    //reading ca

    var method = null;
    if (q.protocol == "http:") {
        if (req.type == "get") method = http.get;
        if (req.type == "post") method = http.post;
    } else if (q.protocol == "https:") {
        if (req.type == "get") method = https.get;
        if (req.type == "post") method = https.post;
        if (req.ignoreWrongSSL) options.rejectUnauthorized = false;
    }
    console.log(options);
    var agent = new https.Agent(options);

    return new Promise((resolve, reject) => {
        method(req.url, options, (response) => {
            let chunk = [];

            response.on('data', (fragments) => {
                chunk.push(fragments);
            });
            response.on('end', () => {
                var resp = {}
                resp.body = Buffer.concat(chunk).toString();
                resp.headers = response.headers;
                resp.code = response.statusCode;
                resolve(resp);
            });
        }).on('error', (e) => {
            console.log(e.message);
            var resp = {}
            resp.error = e.message;
            resolve(resp);
        });
    });
}

function findtc(arr, tc) {
    console.log("step name " + tc.name);
    var stepcopy = JSON.parse(JSON.stringify(tc));
    if (stepcopy.function != null) {
        for (let servicenumber in arr.services) {
            console.log("service name " + arr.services[servicenumber].name);
            for (let functionnumber in arr.services[servicenumber].functions) {
                console.log("function name " + arr.services[servicenumber].functions[functionnumber].name);
                if (arr.services[servicenumber].functions[functionnumber].name == stepcopy.function) {
                    stepcopy = JSON.parse(JSON.stringify(arr.services[servicenumber].functions[functionnumber]));
                    stepcopy.urlprefix = arr.services[servicenumber].url;
                    // stepcopy.url;
                }
            }
        }
    }
    return stepcopy;
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
                    continue;
                }
                let ll = l.split(",");
                let i = 0;
                let arra = [];
                headers.forEach(function(h) {
                    arra[h] = ll[i];
                    i++;
                });
                console.log(arra);
                all_responses = []
                for (let stepnumber in arr.testsuites[tsnumber].testcases[tcnumber].steps) {
                    if (
                        arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].disabled &&
                        arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].disabled == true) {
                        continue;
                    }
                    var stepcopy = findtc(arr,
                        arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber]
                    );
                    if (stepcopy.urlprefix) stepcopy.url = stepcopy.urlprefix + stepcopy.url;
                    for (let d in arra) {
                        console.log(d);
                        console.log(arra[d]);
                        stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                    }
                    for (const match of stepcopy.url.matchAll(/{{(.*)#(.*)}}/g)) {
                        console.log(match)
                    }
                    await request2(stepcopy);
                }
            }
        }
    }
    //    console.log(JSON.stringify(all_responses));
}

function addToLog(str) {
    //<?xml version="1.0" encoding="utf-8"?>
    fs.writeFileSync(path.normalize(__dirname + "/bela2log.xml"), str, {
        "flag": "a"
    });
}

async function request2(req) {
    console.log("request " + JSON.stringify(req));
    addToLog("<request>\n");
    addToLog("  <url>" + req.url + "</url>\n");
    for (let headername in req.headers) {
        addToLog("  <header>" + req.headers[headername] + "</header>\n");
    }
    addToLog("  <body>\n");
    addToLog("  <![CDATA[\n" + req.content.replace("]]>", "]]]]><![CDATA[>") + "\n]]>\n");
    addToLog("  </body>\n");
    console.log("start");
    for (let assertnumber in req.asserts) {
        addToLog("  <response_assert>" + assertnumber + ": " + req.asserts[assertnumber] + "</response_assert>\n");
    }
    var response = await executeRequest(req);
    if (response.error) {
        addToLog("  <response_error>" + response.error + "</response_error>\n");
    } else {
        response.name = req.name;
        all_responses.push(response);
        for (let headername in response.headers) {
            addToLog("  <response_header>" + headername + ": " + response.headers[headername] + "</response_header>\n");
        }
        addToLog("  <response_code>" + response.code + "</response_code>\n");
        addToLog("  <response_body>\n");
        addToLog("  <![CDATA[\n" + response.body.replace("]]>", "]]]]><![CDATA[>") + "\n]]>\n");
        addToLog("  </response_body>\n");
    }
    console.log("end");
    addToLog("</request>\n");
}


/*
const ls = child_process('ls', ['/usr']);
ls.stderr.on('data', (data) => {
  console.error("stderr: "+data);
});
ls.stdout.on('data', (data) => {
  console.log("stdout "+data);
});
ls.on('close', (code) => {
  console.log("exit"+ code);
});
*/

function sendHTMLHead(res) {
    res.statusCode = 200;
    //    res.setHeader('Cache-Control', 'no-store');
    //  res.setHeader('Cache-Control', 'must-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
}

function sendHTMLBody(req, res, text) {
    if (req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.end(zlib.gzipSync(text));
    } else if (req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('deflate')) {
        res.setHeader('Content-Encoding', 'deflate');
        res.end(zlib.deflateSync(text));
    } else {
        res.end(text);
    }
}

function sendHTML(req, res, text) {
    sendHTMLHead(res);
    sendHTMLBody(req, res, text);
}

let jsonObj = [];

const onRequestHandler = (req, res) => {
    if (req.method === 'GET') {
        const params = url.parse(req.url, true).query;
        if (params['file'] && fs.existsSync(
                path.normalize(__dirname + "/projects/" + params['file']))) {
            if (!jsonObj[params['file']]) {
                jsonObj[params['file']] = JSON.parse(readFileContentSync("/projects/" + params['file']));
            }
            if (params['run']) {
                executetestcase(jsonObj[params['file']], []);
            }

            var obiekt = "";

            var tc = "";

            for (let servicenumber in jsonObj[params['file']].services) {
                tc += "<br>service " +
                    "<a href=?file=" + params['file'] + "&service=" +
                    jsonObj[params['file']].services[servicenumber].name + ">" +
                    jsonObj[params['file']].services[servicenumber].name + "</a>";
                for (let functionnumber in jsonObj[params['file']].services[servicenumber].functions) {
                    tc += "<br>&nbsp;&nbsp; function " +
                        "<a href=?file=" + params['file'] + "&function=" +
                        jsonObj[params['file']].services[servicenumber].functions[functionnumber].name + ">" +
                        jsonObj[params['file']].services[servicenumber].functions[functionnumber].name + "</a>";
                }
            }


            for (let tsnumber in jsonObj[params['file']].testsuites) {
                tc += "<br>testsuite name " +
                    "<a href=?file=" + params['file'] + "&ts=" +
                    jsonObj[params['file']].testsuites[tsnumber].name + ">" +
                    jsonObj[params['file']].testsuites[tsnumber].name + "</a>";
                for (let tcnumber in
                        jsonObj[params['file']].testsuites[tsnumber].testcases) {
                    tc += "<br>&nbsp;&nbsp;testcase name " +
                        "<a href=?file=" + params['file'] + "&tc=" +
                        jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].name + ">" +
                        jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].name + "</a>";
                    for (let stepnumber in jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].steps) {
                        tc += "<br>&nbsp;&nbsp;&nbsp;&nbsp;step name " +
                            "<a href=?file=" + params['file'] + "&step=" +
                            jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].name + ">" +
                            jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].name + "</a>";

                        if (jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].name == params['step']) {

                            var stepcopy = findtc(jsonObj[params['file']],
                                jsonObj[params['file']].testsuites[tsnumber].testcases[tcnumber].steps[stepnumber]
                            );

                            obiekt = readFileContentSync("/internal/tc.txt").replace("<!--NAME-->",
                                stepcopy.name);
                            if (stepcopy.urlprefix) obiekt = obiekt.replace("<!--URLPREFIX-->", stepcopy.urlprefix);
                        }

                    }
                }
            }

            sendHTML(req, res, readFileContentSync("/internal/project.txt")
                .replace("<!--NAME-->", params['file'])
                .replace("<!--TC-->", tc)
                .replace("<!--OBIEKT-->", obiekt)
                .replace("<!--RUN-->", "<p><a href=?file=" + params['file'] + "&run=1>run all</a>"));
            return;
        }
    }

    let files = "";
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    for (filenumber in all_files) {
        files += "<a href=?file=" + all_files[filenumber] + ">" + all_files[filenumber] + "</a>";
    }

    sendHTML(req, res, readFileContentSync("/internal/index.txt").replace("<!--FILES-->", files));
};

http2.createSecureServer({
    key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
    cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
}, onRequestHandler).listen(port, hostname, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
});

//let jsonObj = JSON.parse(readFileContentSync("/bela3.json"));
//executetestcase(jsonObj, []);