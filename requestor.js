//formatted with js-beautify -e "\n" ng1.js > x

const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const url = require('url');
const zlib = require('zlib');
const child_process = require('child_process');
const sqlite3 = require('sqlite3');

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
    options.timeout = 3000;
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

function addToLog(str) {
    //<?xml version="1.0" encoding="utf-8"?>
    //    fs.writeFileSync(path.normalize(__dirname + "/bela2log.xml"), str, {
    //        "flag": "a"
    //    });
}

function digits(a, b) {
    let x = a.toString();
    while (x.length < b) {
        x = "0" + x;
    }
    return x;
}

async function request2(req, res, name, times) {
    //let s = JSON.stringify(req);
    let dt = new Date();
    let curDT = dt.getFullYear() + "-" + digits(dt.getMonth() + 1, 2) + "-" +
        digits(dt.getDate(), 2) + " " +
        digits(dt.getHours(), 2) + ":" +
        digits(dt.getMinutes(), 2) + ":" +
        digits(dt.getSeconds(), 2) + " " + digits(dt.getMilliseconds(), 3);
    let s = "{\"oldtimes\":" + JSON.stringify(times) + ",\"datetime\":\"" + curDT + "\",";
    s += "\"url\":\"" + req.url + "\",";
    console.log("request " + JSON.stringify(req));
    console.log("start");
    var response = await executeRequest(req);
    if (response.error) {
        s += response.error;
    } else {
        response.name = req.name;
        all_responses.push(response);

        var headers = "";
        s += "\"headers\":[";
        for (let headername in req.headers) {
            s += "\"" + encodeURIComponent(req.headers[headername]) + "\",";
            headers += req.headers[headername] + "\n";
        }
        s += "\"\"],\"body\":\"" + encodeURIComponent(req.content) + "\",";

        var headers_res = "";
        s += "\"headers_res\":[";
        for (let headername in response.headers) {
            if (Array.isArray(response.headers[headername])) {
                for (let headerx in response.headers[headername]) {
                    s += "\"" + encodeURIComponent(headername + ": " + response.headers[headername][headerx]) + "\",";
                    headers_res += headername + ": " + response.headers[headername][headerx] + "\n";
                }
            } else {
                s += "\"" + encodeURIComponent(headername + ": " + response.headers[headername]) + "\",";
                headers_res += headername + ": " + response.headers[headername] + "\n";
            }
        }
        s += "\"\"],\"body_res\":\"" + encodeURIComponent(response.body) + "\"}";
        db.run(`insert into requests (dt, name, url, headers,body,headers_res,body_res) values(?,?,?,?,?,?,?)`,
            curDT, name, req.url, headers, req.content, headers_res, response.body,
            err => {
                console.log("error " + err)
            });
    }
    console.log("end");
    return s;
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

function sendJSHead(res) {
    res.statusCode = 200;
    //    res.setHeader('Cache-Control', 'no-store');
    //  res.setHeader('Cache-Control', 'must-revalidate');
    res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
}

function sendCSSHead(res) {
    res.statusCode = 200;
    //    res.setHeader('Cache-Control', 'no-store');
    //  res.setHeader('Cache-Control', 'must-revalidate');
    res.setHeader('Content-Type', 'text/css; charset=UTF-8');
}

function sendHTML(req, res, text) {
    sendHTMLHead(res);
    sendHTMLBody(req, res, text);
}

function sendJS(req, res, text) {
    sendJSHead(res);
    sendHTMLBody(req, res, text);
}

function sendCSS(req, res, text) {
    sendCSSHead(res);
    sendHTMLBody(req, res, text);
}

let jsonObj = [];

function directToOKFileNotFoundNoRet(res, txt, ok) {
    res.statusCode = ok ? 200 : 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end(txt);
}

// return values from sub functions are ignored.
async function parsePOSTforms(params, res, jsonObj) {
    console.log(params);
    if (params["runstep"]) {
        return parsePOSTRunStep(params, res, jsonObj);
    } else if (params["getstep"] && params["dt"]) {
        return parsePOSTGetStep(params, res, jsonObj);
    } else if (!(params['file'] && fs.existsSync(
            path.normalize(__dirname + "/projects/" + params['file'])))) {
        return;
    }

            if (!jsonObj[params['file']]) {
                jsonObj[params['file']] = JSON.parse(readFileContentSync("/projects/" + params['file']));
            }

    var obiekt = "";
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    for (let servicenumber in jsonObj[params['file']].services) {
        var service = jsonObj[params['file']].services[servicenumber];
        if (service.name == params['service']) {
            if (res != null) res.end("<br>service");
            return;
        }
        for (let functionnumber in service.functions) {
            var func = service.functions[functionnumber];
            if (func.name == params['function']) {
                obiekt = readFileContentSync("/internal/function.txt").replace("<!--NAME-->", func.name).replace("<!--URL-->", func.url);
                var xxxx = "";
                for (var headernumber in func.headers) {
                    xxxx += func.headers[headernumber];
                }
                obiekt = obiekt.replace("<!--HEADER-->", xxxx);
                var xxxx = "";
                for (var bodynumber in func.content) {
                    xxxx += func.content[bodynumber];
                }
                if (res != null) res.end(obiekt.replace("<!--BODY-->", xxxx));
                return;
            }
        }
    }

    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var suite = jsonObj[params['file']].testsuites[tsnumber];
        if (suite.name == params['ts']) {
            obiekt = readFileContentSync("/internal/ts.txt").replace("<!--NAME-->", suite.name);
            if (res != null) res.end(obiekt);
            return;
        }

        for (let tcnumber in suite.testcases) {
            var tc = suite.testcases[tcnumber];
            if (tc.name == params['tc']) {
                obiekt = readFileContentSync("/internal/tc.txt").replace("<!--NAME-->", tc.name);
                var xxxx = "<script>var csvData =`";
                for (var inputnumber in tc.input) {
                    xxxx += tc.input[inputnumber] + "\n";
                }
                xxxx += "`;</script>";
                if (res != null) res.end(obiekt.replace("<!--DATA-->", xxxx));
                return;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (!(step.name == params['step'])) {
                    continue;
                }
                var stepcopy = findtc(jsonObj[params['file']], step);
                obiekt = readFileContentSync("/internal/step.txt").replace("<!--NAME-->",
                    stepcopy.name);
                if (stepcopy.urlprefix) obiekt = obiekt.replace("<!--URLPREFIX-->", stepcopy.urlprefix);
                obiekt = obiekt.replace("<!--URL-->", stepcopy.url);
                var xxxx = "";
                for (var headernumber in stepcopy.headers) {
                    xxxx += stepcopy.headers[headernumber];
                }
                obiekt = obiekt.replace("<!--HEADER-->", xxxx);
                var xxxx = "";
                for (var bodynumber in stepcopy.content) {
                    xxxx += stepcopy.body[bodynumber];
                }
                obiekt = obiekt.replace("<!--BODY-->", xxxx);
                var xxxx = "";
                let rows = await db_all("SELECT dt from requests where name =\"" + step.name + "\" order by dt desc");
                for (let row in rows) {
                    xxxx += "<option value=\"" + rows[row].dt + "\">" + rows[row].dt + "</option>";
                }
                if (res != null) res.end(obiekt.replace("<!--WHENLAST-->", xxxx));
                return;
            }
        }
    }
    if (res != null) res.end("");
}

async function parsePOSTRunStep(params, res, jsonObj2) {
    //    if (!params["text"] || !params["state"] || !params["type"] || !params["title"]) {
    //        return directToOKFileNotFoundNoRet(res, '', false);
    //    }

    var sss = "";

    console.log(params);
    console.log(jsonObj);
    let arr = jsonObj[params['file']];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    let times = [];

    for (let tsnumber in arr.testsuites) {
        var ts = arr.testsuites[tsnumber];
        console.log("testsuite name " + ts.name);
        for (let tcnumber in ts.testcases) {
            var tc = ts.testcases[tcnumber];
            console.log("testcase name " + tc.name);

            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (tc.disabled && tc.disabled == true) {
                    continue;
                }
                console.log(step.name + " vs " + params['runstep']);
                if (step.name.localeCompare(params['runstep']) != 0) {
                    continue;
                }
                console.log("starting " + step.name + " vs " + params['runstep']);

                let lines = tc.input;
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
                    var stepcopy = findtc(arr, step);
                    if (stepcopy.urlprefix) stepcopy.url = stepcopy.urlprefix + stepcopy.url;
                    for (let d in arra) {
                        console.log(d);
                        console.log(arra[d]);
                        stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                    }
                    for (const match of stepcopy.url.matchAll(/{{(.*)#(.*)}}/g)) {
                        console.log(match)
                    }
                    sss = await request2(stepcopy, res, step.name, times);
                    times.push(JSON.parse(sss).datetime);

                    if (stepcopy.url == step.url) break;
                }

            }
        }
    }
    if (res != null) res.end(sss);
}

async function parsePOSTGetStep(params, res, jsonObj2) {
    //    if (!params["text"] || !params["state"] || !params["type"] || !params["title"]) {
    //        return directToOKFileNotFoundNoRet(res, '', false);
    //    }

    console.log(jsonObj);
    let arr = jsonObj[params['file']];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    for (let tsnumber in arr.testsuites) {
        var ts = arr.testsuites[tsnumber];
        console.log("testsuite name " + ts.name);
        for (let tcnumber in ts.testcases) {
            var tc = ts.testcases[tcnumber];
            console.log("testcase name " + tc.name);
            let lines = tc.input;
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
                for (let stepnumber in tc.steps) {
                    var step = tc.steps[stepnumber];
                    if (step.disabled && step.disabled == true) {
                        continue;
                    }
                    console.log(step.name + " vs " + params['getstep']);

                    if (step.name.localeCompare(params['getstep']) != 0) {
                        continue;
                    }
                    console.log("starting " + step.name + " vs " + params['getstep']);
                    var stepcopy = findtc(arr, step);
                    if (stepcopy.urlprefix) stepcopy.url = stepcopy.urlprefix + stepcopy.url;
                    for (let d in arra) {
                        console.log(d);
                        console.log(arra[d]);
                        stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                    }
                    for (const match of stepcopy.url.matchAll(/{{(.*)#(.*)}}/g)) {
                        console.log(match)
                    }

                    let rows = await db_all("SELECT * from requests where name =\"" + step.name + "\" and dt=\"" + decodeURIComponent(params["dt"]) + "\"");
                    console.log(rows);
                    let s = "{\"datetime\":\"" + decodeURIComponent(params["dt"]) + "\",";
                    s += "\"url\":\"" + rows[0].url + "\",";
                    s += "\"headers\":[\"" + rows[0]["headers"].replaceAll("\"", "").replaceAll("\n", "\",\"");
                    s += "\"],\"body\":\"" + encodeURIComponent(rows[0]["body"]) + "\",";
                    s += "\"headers_res\":[\"" + rows[0]["headers_res"].replaceAll("\"", "").replaceAll("\n", "\",\"");
                    s += "\"],\"body_res\":\"" + encodeURIComponent(rows[0]["body_res"]) + "\"";
                    s += "}";
                    if (res != null) res.end(s);
                }
            }
        }
    }
    //            res.end('cos');
}

function db_all(sql) {
    return new Promise((resolve, reject) => {
        const q = [];
        db.each(sql, (err, row) => {
                if (err) {
                    reject(err);
                }
                q.push(row);
            },
            (err, n) => {
                if (err) {
                    reject(err);
                }
                resolve(q);
            });
    });
}

const onRequestHandler = async (req, res) => {
    if (req.method === 'GET') {
        var l = ["/external/split.min.js", "/external/split.min.js.map", "/external/tabulator.min.js", "/external/tabulator.min.js.map", "/external/tabulator_midnight.min.css.map"];
        for (u in l) {
            if (req.url == l[u]) {
                sendJS(req, res, readFileContentSync(l[u]));
                return;
            }
        }
        if (req.url == "/external/tabulator_midnight.min.css") {
            sendCSS(req, res, readFileContentSync("/external/tabulator_midnight.min.css"));
            return;
        }

        const params = url.parse(req.url, true).query;
        if (params['file'] && fs.existsSync(
                path.normalize(__dirname + "/projects/" + params['file']))) {
            if (!jsonObj[params['file']]) {
                jsonObj[params['file']] = JSON.parse(readFileContentSync("/projects/" + params['file']));
            }

            var list = "<ul>";
            for (let servicenumber in jsonObj[params['file']].services) {
                var service = jsonObj[params['file']].services[servicenumber];
                list += "<li class=\"folder folder-open\">" +
                    "<a onclick=loadRightPart(\"file=" + params['file'] + "&service=" +
                    service.name + "\")>" + service.name + "</a><ul>";
                for (let functionnumber in service.functions) {
                    var func = service.functions[functionnumber];
                    list += "<li class=\"file\">" +
                        "<a onclick=loadRightPart(\"file=" + params['file'] + "&function=" +
                        func.name + "\")>" + func.name + "</a></li>";
                }
                list += "</ul></li>";
            }
            for (let tsnumber in jsonObj[params['file']].testsuites) {
                var ts = jsonObj[params['file']].testsuites[tsnumber];
                list += "<li class=\"folder folder-open\">" +
                    "<a onclick=loadRightPart(\"file=" + params['file'] + "&ts=" +
                    ts.name + "\")>" + ts.name + "</a><ul>";

                for (let tcnumber in ts.testcases) {
                    var tc = ts.testcases[tcnumber];
                    list += "<li class=\"folder folder-open\">" +
                        "<a onclick=loadRightPart(\"file=" + params['file'] + "&tc=" +
                        tc.name + "\")>" + tc.name + "</a><ul>";

                    for (let stepnumber in tc.steps) {
                        var step = tc.steps[stepnumber];
                        list += "<li class=\"file\">" +
                            "<a onclick=loadRightPart(\"file=" + params['file'] + "&step=" +
                            step.name + "\")>" + step.name + "</a></li>";
                    }
                    list += "</li></ul>";
                }
                list += "</li></ul>";
            }
            list += "</ul>";

            sendHTML(req, res, readFileContentSync("/internal/project.txt")
                .replace("<!--TC-->", list)
                .replace("<!--NAME-->", params['file'])
                .replace("<!--RUN-->", "<p><a href=?file=" + params['file'] + "&run=1>run all</a>"));
            return;
        }
    } else if (req.headers['content-type'] == "application/x-www-form-urlencoded") { // POST
        let body = "";
        req.on('data', function(data) {
            body += data;
            if (body.length > 1e6 * 6) req.connection.destroy(); // 6 MB 
        });
        req.on('end', function() {
            console.log(body);
            parsePOSTforms(url.parse("/?" + body, true).query, res, jsonObj);
        });
        return;
    }

    let files = "";
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    for (filenumber in all_files) {
        files += "<a href=?file=" + all_files[filenumber] + ">" + all_files[filenumber] + "</a><br>";
    }

    sendHTML(req, res, readFileContentSync("/internal/index.txt").replace("<!--FILES-->", files));
};


var db = new sqlite3.Database('m.db', (err) => {
    if (err) {
        console.log("DB error " + err);
        exit(1);
    }
    db.exec(`
    create table requests (
	dt text not null,
        name text not null,
        url text not null,
        headers text not null,
	body text not null,
        headers_res text not null,
	body_res text not null
    );`, () => {});
});

http2.createSecureServer({
    key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
    cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
}, onRequestHandler).listen(port, hostname, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
});