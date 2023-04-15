//formatted with js-beautify -e "\n" ng1.js > x

const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const url = require('url');
const {spawn} = require('child_process');

const hostname = '127.0.0.1';
const port = 3000;

var x = fs.readFileSync(path.normalize(__dirname + "/bela3.json"), 'utf8');
x = x.charCodeAt(0) == 65279 ? x.substring(1) : x;
let jsonObj = JSON.parse(x)

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
                    console.log("step name " + arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber].name);
                    var stepcopy = JSON.parse(JSON.stringify(arr.testsuites[tsnumber].testcases[tcnumber].steps[stepnumber]));
                    if (stepcopy.disabled && stepcopy.disabled == true) {
                        continue;
                    }
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
                    }
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

//executetestcase(jsonObj, []);

/*
const ls = spawn('ls', ['/usr']);
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

const onRequestHandler = (req, res) => {
/*    if (processExternalFiles(req, res)) return;

    console.log(' ');
    let cookieSessionToken = "";
    let userName = null;
    //console.log(req.headers);
    if (req.headers['cookie']) {
        console.log(req.headers['cookie']);
        req.headers['cookie'].split("; ").forEach(function(cookie) {
            if (cookie.indexOf("session=") == 0) cookieSessionToken = cookie.substr(8);
        });
    }
    if (cookieSessionToken != "") {
        for (let index in sessions) {
            session = sessions[index];
            //            console.log("mamy sesję1 " + session[SessionField.SessionToken]);
            if (session[SessionField.Expiry] < Date.now()) {
                if (session[SessionField.RefreshCallback] != null) clearTimeout(session[SessionField.RefreshCallback]);
                sessions.splice(index, 1);
                continue;
            }
            //            console.log("mamy sesję2 " + session[SessionField.SessionToken]);
            if (cookieSessionToken == session[SessionField.SessionToken]) {
                userName = session[SessionField.UserName];
                console.log("found user " + userName);
                session[SessionField.Expiry] += sessionValidity;
                break;
            }
        }
    }
    const newCookieSessionToken = (userName == null);
    if (userName == null) {
        userName = "";
        const cookieSessionToken = crypto.randomBytes(32).toString('base64');

        res.setHeader('Set-Cookie', 'session=' + cookieSessionToken + '; SameSite=Strict; Secure');

        // order must be consistent with SessionField
        sessions.push([cookieSessionToken, Date.now() + sessionValidity, '', null]); // non logged

        console.log("nowa sesja " + cookieSessionToken);
    }
    console.log('user name is ' + userName);

    if (req.method === 'GET') {
        console.log(req.url);
        const params = url.parse(req.url, true).query;
        if (params["sse"]) { // PUSH functionality
            parseGETWithSseParam(req, res, userName, cookieSessionToken);
            if (newCookieSessionToken) {
                setTimeout(function() {
                    sendReloadToPage(res);
                }, 2000); // 2 seconds
            }
        } else if (params["set"]) { // setting cookies with config
            parseGETWithSetParam(req, res, params);
        } else if (params["q"]) {
            parseGETWithQParam(req, res, params, userName);
        } else {
            showMainPagePrzyp(req, res, 0, [], userName);
        }
    } else if (req.headers['content-type'] == "application/x-www-form-urlencoded" && cookieSessionToken != "") { // POST
        let body = "";
        req.on('data', function(data) {
            body += data;
            if (body.length > 1e6 * 6) req.connection.destroy(); // 6 MB 
        });
        req.on('end', function() {
            console.log(body);
            parsePOSTforms(url.parse("/?" + body, true).query, res, userName, cookieSessionToken);
        });
    }*/
};

http2.createSecureServer({
    key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
    cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
}, onRequestHandler).listen(port, hostname, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
});
