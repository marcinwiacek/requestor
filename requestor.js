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
const tls = require('node:tls');

const hostname = '127.0.0.1';
const port = 3000;
const maxResultsPerRequest = 500;

let jsonObj = [];
let dbObj = [];

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

function loadFile(name) {
    if (!jsonObj[name]) {
        try {
            jsonObj[name] = JSON.parse(readFileContentSync("/projects/" + name));
        } catch (e) {
            return false;
        }
    }
    return true;
}

function digits(a, b) {
    let x = a.toString();
    while (x.length < b) {
        x = "0" + x;
    }
    return x;
}

async function executeRequest(req) {
    console.log("request " + JSON.stringify(req));
    var q = url.parse(req.url, true);
    console.log("url " + JSON.stringify(q));
    var certinfo = '';
    const options = {
        //	hostname:q.hostname,
        //	port:443,
        //	path:q.path,
        //        method:req.method
        //        req.headers
        //key:
        //cert:
        agent: false
    };

    if (req.conLen) {
        req.headers["Content-Length"] = "Content-Length: " + req.body.length;
    }

    var method2 = null;
    if (q.protocol == "http:") {
        method2 = req.method == "get" ? http.get : http.request;
    } else if (q.protocol == "https:") {
        method2 = req.method == "get" ? https.get : https.request;
        if (req.ignoreWrongSSL) options.rejectUnauthorized = false;
    }
    if (method2 == null) {
        var resp = {}
        resp.body = '';
        resp.headers = [];
        resp.code = 0;
        resp.error = "Error parsing url, supported http: and https: in this moment";
        resp.certinfo = "";
        return (resp);
    }
    options.method = req.method;
    options.timeout = 3000;
    return new Promise((resolve, reject) => {
        const r = method2(req.url, options, (response) => {
            const chunk = []
            try {
                var cipher = r.socket.getCipher();
                certinfo += "Cipher\n  " + cipher.standardName + ", " + cipher.version + "\n\n";
                var cert = r.socket.getPeerCertificate(true);
                if (cert != undefined && cert.subject) {
                    while (true) {
                        certinfo += "Certificate\n";
                        certinfo += '  subject CN ' + cert.subject.CN + ', O ' + cert.subject.O + "\n";
                        certinfo += '  issuer CN ' + cert.issuer.CN + ', O ' + cert.issuer.O + "\n";
                        certinfo += '  Valid ' + cert.valid_from + " - " + cert.valid_to + "\n";
                        certinfo += '  SHA256 ' + cert.fingerprint256 + "\n\n";
                        lastprint256 = cert.fingerprint256;
                        cert = cert.issuerCertificate;
                        if (cert == undefined || lastprint256 == cert.fingerprint256) break;
                    }
                }
            } catch (e) {
                certinfo = "Not possible to get certificate"
            }
            response.on('data', (fragments) => {
                chunk.push(fragments);
            });
            response.on('end', () => {
                var resp = {}
                resp.body = Buffer.concat(chunk).toString();
                resp.headers = response.headers;
                resp.code = response.statusCode;
                resp.error = "";
                resp.certinfo = certinfo;
                resolve(resp);
            });
        }).on('error', (e) => {
            console.log("error is " + e.message + " " + e);
            console.log("error is " + e.errors);
            var s = e.errors + " ";
            var resp = {}
            resp.body = '';
            resp.headers = [];
            resp.code = 0;
            if (s == 'undefined ') {
                resp.error = e.message;
            } else {
                resp.error = s;
            }
            resp.certinfo = certinfo;
            resolve(resp);
        });
        if (req.method == "post") {
            r.write(req.body);
            r.end();
        }
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

async function request2(req, res, name, times, filename) {
    console.log("request " + JSON.stringify(req));
    console.log("start");
    let dt = new Date();
    let curDT = dt.getFullYear() + "-" + digits(dt.getMonth() + 1, 2) + "-" +
        digits(dt.getDate(), 2) + " " + digits(dt.getHours(), 2) + ":" +
        digits(dt.getMinutes(), 2) + ":" + digits(dt.getSeconds(), 2) + " " +
        digits(dt.getMilliseconds(), 3);
    var response = await executeRequest(req);
    let dt2 = new Date();
    let curDT2 = dt2.getFullYear() + "-" + digits(dt2.getMonth() + 1, 2) + "-" +
        digits(dt2.getDate(), 2) + " " + digits(dt2.getHours(), 2) + ":" +
        digits(dt2.getMinutes(), 2) + ":" + digits(dt2.getSeconds(), 2) + " " +
        digits(dt2.getMilliseconds(), 3);
    var headers = "";
    var headers_res = "";
    for (let headername in req.headers) {
        headers += req.headers[headername] + "\n";
    }
    for (let headername in response.headers) {
        if (Array.isArray(response.headers[headername])) {
            for (let headerx in response.headers[headername]) {
                headers_res += headername + ": " + response.headers[headername][headerx] + "\n";
            }
        } else {
            headers_res += headername + ": " + response.headers[headername] + "\n";
        }
    }
    dbObj[filename].run(`insert into requests (dt, name, url, headers,body,headers_res,body_res,method,ssl_ignore,code_res,cert_res,dt_res,error_res) values(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        curDT, name, req.url, headers, req.body, headers_res, response.body, req.method, req.ignoreWrongSSL, response.code, response.certinfo, curDT2, response.error,
        err => {
            console.log("error " + err)
        });
    console.log("end");
    return "{" + (await getJSON(name, curDT, filename)) + ",\"oldtimes\":" + JSON.stringify(times) + "}";
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

function sendBody(req, res, text) {
    res.statusCode = 200;
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
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    sendBody(req, res, text);
}

function sendPlain(req, res, text) {
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    sendBody(req, res, text);
}

function sendJS(req, res, text) {
    res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
    sendBody(req, res, text);
}

function sendCSS(req, res, text) {
    res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    sendBody(req, res, text);
}

function findElement(jsonObj, params) {
    return findElement2(jsonObj, params, params['path']);
}

function findElement2(jsonObj, params, pathString) {
    let elpath = pathString.split("/");

    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var suite = jsonObj[params['file']].testsuites[tsnumber];
        if (elpath.length == 1 && suite.name == elpath[0]) {
            retVal = [];
            retVal.obj = suite;
            retVal.index = tsnumber;
            retVal.parent = jsonObj[params['file']].testsuites;
            return retVal;
        }
        for (let tcnumber in suite.testcases) {
            var tc = suite.testcases[tcnumber];
            if (elpath.length == 2 && suite.name == elpath[0] && tc.name == elpath[1]) {
                retVal = [];
                retVal.obj = tc;
                retVal.index = tcnumber;
                retVal.parent = suite.testcases;
                return retVal;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (elpath.length == 3 && suite.name == elpath[0] && tc.name == elpath[1] && step.name == elpath[2]) {
                    retVal = [];
                    retVal.obj = step;
                    retVal.index = stepnumber;
                    retVal.parent = tc.steps;
                    return retVal;
                }
            }
        }
    }
    return null;
}

// return values from sub functions are ignored.
async function parsePOSTforms(req, params, res, jsonObj) {
    console.log(params);
    loadFile(params['file']);
    loadDB(params['file']);
    if (params["runstep"]) {
        return parsePOSTRunStep(req, params, res, jsonObj);
    } else if (params["op"] == "savefile") {
        return parsePOSTSaveFile(req, params, res, jsonObj);
    } else if (params["op"] == "newelement") {
        return parsePOSTNewElement(req, params, res, jsonObj);
    } else if (params["op"] == "newelementinside") {
        return parsePOSTNewElementInside(req, params, res, jsonObj);
    } else if (params["op"] == "pasteelement") {
        return parsePOSTPasteElement(req, params, res, jsonObj);
    } else if (params["op"] == "renameelement") {
        return parsePOSTRenameElement(req, params, res, jsonObj);
    } else if (params["op"] == "enabledisableelement") {
        return parsePOSTEnableDisableElement(req, params, res, jsonObj);
    } else if (params["op"] == "deleteelement") {
        return parsePOSTDeleteElement(req, params, res, jsonObj);
    } else if (params["op"] == "getstep" && params["dt"]) {
        return parsePOSTGetStep(req, params, res, jsonObj);
    } else if (!(params['file'] && fs.existsSync(
            path.normalize(__dirname + "/projects/" + params['file'])))) {
        return;
    }

    let elpath = params['path'].split("/");

    var obiekt = "";

    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var suite = jsonObj[params['file']].testsuites[tsnumber];
        let pathwithnum = tsnumber;
        let path = suite.name;
        if (elpath.length == 1 && suite.name == elpath[0]) {
            sendPlain(req, res, readFileContentSync("/internal/ts.txt").replace("<!--NAME-->", suite.name));
            return;
        }

        for (let tcnumber in suite.testcases) {
            var tc = suite.testcases[tcnumber];
            if (elpath.length == 2 && suite.name == elpath[0] && tc.name == elpath[1]) {
                obiekt = readFileContentSync("/internal/tc.txt").replace("<!--NAME-->", tc.name);
                var xxxx = "<script>var csvData =`";
                for (var inputnumber in tc.input) {
                    xxxx += tc.input[inputnumber] + "\n";
                }
                xxxx += "`;</script>";
                sendPlain(req, res, obiekt.replace("<!--DATA-->", xxxx));
                return;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (elpath.length == 3 && suite.name == elpath[0] && tc.name == elpath[1] && step.name == elpath[2]) {} else {
                    continue;
                }
                var stepcopy = findtc(jsonObj[params['file']], step);
                pathwithnum += "/" + tcnumber + "/" + stepnumber;
                path += "/" + tc.name + "/" + step.name;

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
                for (var bodynumber in stepcopy.body) {
                    xxxx += stepcopy.body[bodynumber];
                }
                obiekt = obiekt.replace("<!--BODY-->", xxxx)
                    .replace("<!--SSLIGNORE-->", stepcopy.ignoreWrongSSL ? "checked" : "")
                    .replace("<!--CONLENGTH-->", stepcopy.conLen ? "checked" : "")
                    .replace("<!--METHOD-->", stepcopy.method)
                    .replace("<!--PATH-->", "<script>path = '" + path + "';</script>");
                var xxxx = "";
                let rows = await db_all(params['file'], "SELECT dt from requests where name =\"" + pathwithnum + "\" order by dt desc");
                var num = 0;
                var del = "";
                for (let row in rows) {
                    xxxx += "<option value=\"" + rows[row].dt + "\">" + rows[row].dt + "</option>";
                    if (num == maxResultsPerRequest) {
                        if (del != "") del += ",";
                        del += "'" + rows[row].dt + "'";
                    } else {
                        num++;
                    }
                }
                if (del != "") {
                    await db_all(params['file'], "DELETE from requests where name =\"" + pathwithnum + "\" and dt in (" + del + ")");
                }
                sendPlain(req, res, obiekt.replace("<!--WHENLAST-->", xxxx));
                return;
            }
        }
    }
    sendPlain(req, res, "");
}

async function parsePOSTRenameElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    if (el != null) {
        console.log(el);
        el.obj.name = params['new'];
        //        await db_all(params['file'], "UPDATE requests set name =\"" + params['newpath'] + "\" where name =\"" + params['path'] + "\" ");
    }
    sendPlain(req, res, "");
}

async function parsePOSTNewElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    if (el != null) {
        let elpath = params['path'].split("/");
        if (elpath.length == 3) {
            let newStep = {};
            newStep.name = params["new"];
            newStep.method = "POST";
            newStep.headers = "";
            newStep.body = "";
            newStep.ignoreWrongSSL = true;
            newStep.conLen = true;
            newStep.url = "https://";
            newStep.headers = "";
            el.parent.splice(el.index, 0, newStep);
        } else if (elpath.length == 2) {
            let newTC = {};
            newTC.name = params["new"];
            newTC.steps = [];
            newTC.input = [];
            el.parent.splice(el.index, 0, newTC);
        } else if (elpath.length == 1) {
            let newTS = {};
            newTS.name = params["new"];
            newTS.testcases = [];
            el.parent.splice(el.index, 0, newTS);
        }
    }
    sendPlain(req, res, "");
}

async function parsePOSTNewElementInside(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    if (el != null) {
        console.log("found");
        let elpath = params['path'].split("/");
        console.log("found " + elpath.length);
        if (elpath.length == 2) {
            let newStep = {};
            newStep.name = params["new"];
            newStep.method = "POST";
            newStep.headers = "";
            newStep.body = "";
            newStep.ignoreWrongSSL = true;
            newStep.conLen = true;
            newStep.url = "https://";
            newStep.headers = "";
            el.obj.steps.unshift(newStep);
        } else if (elpath.length == 1) {
            let newTC = {};
            newTC.name = params["new"];
            newTC.steps = [];
            newTC.input = [];
            el.obj.testcases.unshift(newTC);
        }
    }
    sendPlain(req, res, "");
}

async function parsePOSTEnableDisableElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    if (el != null) {
        if (el.obj.disabled == true) {
            delete el.obj.disabled;
        } else {
            el.obj.disabled = true;
        }
    }
    sendPlain(req, res, "");
}

async function parsePOSTDeleteElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    if (el != null) {
        el.parent.splice(el.index, 1);
    }
    sendPlain(req, res, "");
}

async function parsePOSTPasteElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params);
    el2 = findElement2(jsonObj2, params, params['new']);
    if (el != null && el2 != null) {
        let newObj = JSON.parse(JSON.stringify(el.obj));
        newObj.name = newObj.name + "(copy)";
        el2.parent.splice(el2.index, 0, newObj);
    }
    sendPlain(req, res, "");
}

async function parsePOSTSaveFile(req, params, res, jsonObj2) {
    //change all positions in db
    //pathwithnumber
    fs.writeFile(path.normalize(__dirname + '/projects/ala'), JSON.stringify(jsonObj[params['file']]), function(err) {
        if (err) {
            return console.log(err);
        }
    });
    sendPlain(req, res, "");
}

async function parsePOSTRunStep(req, params, res, jsonObj2) {
    var sss = "";
    console.log(params);
    let arr = jsonObj[params['file']];
    let times = [];
    for (let tsnumber in arr.testsuites) {
        var ts = arr.testsuites[tsnumber];
        console.log("testsuite name " + ts.name);
        let pathwithnum = tsnumber;
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
                pathwithnum += "/" + tcnumber + "/" + stepnumber;
                console.log("starting " + step.name + " vs " + params['runstep']);
                step.method = params['method'];
                step.headers = decodeURIComponent(params['headers']).split("\n");
                step.body = decodeURIComponent(params['body']);
                step.ignoreWrongSSL = params['ssl'] == "true";
                step.conLen = params['conlen'] == "true";
                step.url = decodeURIComponent(params['url']);
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
                    sss = await request2(stepcopy, res, pathwithnum, times, params['file']);
                    times.push(JSON.parse(sss).datetime);

                    if (stepcopy.url == step.url) break;
                }

            }
        }
    }
    sendPlain(req, res, sss);
}

function loadDB(name) {
    if (!dbObj[name]) {
        dbObj[name] = new sqlite3.Database(path.normalize(__dirname + "/projects/" + name + ".db"), async (err) => {
            if (err) {
                console.log("DB error " + err);
                exit(1);
            }
            dbObj[name].exec(`
    create table requests (
    dt text not null,
    name text not null,
    method text not null,
    url text not null,
    headers text not null,
    body text not null,
    ssl_ignore smallint not null,
    cert_res text not null,
    error_res text,
    headers_res text not null,
    body_res text not null,
    code_res SMALLINT not null,
    dt_res text not null
    );`, () => {});
            let v = await db_all(name, "SELECT sqlite_version();");
            console.log(JSON.stringify(v));
        });
    }
}

function db_all(filename, sql) {
    return new Promise((resolve, reject) => {
        const q = [];
        dbObj[filename].each(sql, (err, row) => {
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

async function getJSON(stepname, dt, file) {
    console.log("searching for " + stepname);
    let rows = await db_all(file, "SELECT * from requests where name =\"" + stepname + "\" and dt=\"" + decodeURIComponent(dt) + "\"");
    if (rows == null) {
        let s = "\"datetime\":\"" + "\",";
        s += "\"datetime_res\":\"" + "\",";
        s += "\"errors\":\"" + "\",";
        s += "\"cert_res\":\"" + "\",";
        s += "\"ssl_ignore\":\"" + false + "\",";
        s += "\"code_res\":\"" + "\",";
        s += "\"url\":\"" + "\",";
        s += "\"method\":\"GET" + "\",";
        s += "\"headers\":[\"";
        s += "\"],\"body\":\"" + "\",";
        s += "\"headers_res\":[\""
        s += "\"],\"body_res\":\"" + "\"";
        return s;
    }

    let s = "\"datetime\":\"" + decodeURIComponent(dt) + "\",";
    s += "\"datetime_res\":\"" + decodeURIComponent(rows[0].dt_res) + "\",";
    s += "\"errors\":\"" + encodeURIComponent(rows[0].error_res) + "\",";
    s += "\"cert_res\":\"" + encodeURIComponent(rows[0].cert_res) + "\",";
    s += "\"ssl_ignore\":\"" + rows[0].ssl_ignore + "\",";
    s += "\"code_res\":\"" + rows[0].code_res + "\",";
    s += "\"url\":\"" + rows[0].url + "\",";
    s += "\"method\":\"" + rows[0]["method"] + "\",";
    s += "\"headers\":[\"" + encodeURIComponent(rows[0]["headers"]);
    s += "\"],\"body\":\"" + encodeURIComponent(rows[0]["body"]) + "\",";
    s += "\"headers_res\":[\"" + encodeURIComponent(rows[0]["headers_res"]);
    s += "\"],\"body_res\":\"" + encodeURIComponent(rows[0]["body_res"]) + "\"";
    return s;
}

async function parsePOSTGetStep(req, params, res, jsonObj2) {
    console.log(jsonObj);
    console.log(params['path']);
    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var ts = jsonObj[params['file']].testsuites[tsnumber];
        let path = ts.name;
        let pathwithnum = tsnumber;
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
                for (let stepnumber in tc.steps) {
                    var step = tc.steps[stepnumber];
                    //                    if (step.disabled && step.disabled == true) {
                    //                        continue;
                    //                    }
                    if ((path + "/" + tc.name + "/" + step.name).localeCompare(params['path']) != 0) {
                        continue;
                    }
                    if (!path.includes("/")) path += "/" + tc.name + "/" + step.name;
                    if (!pathwithnum.includes("/")) pathwithnum += "/" + tcnumber + "/" + stepnumber;
                    var stepcopy = findtc(jsonObj[params['file']], step);
                    if (stepcopy.urlprefix) stepcopy.url = stepcopy.urlprefix + stepcopy.url;
                    for (let d in arra) {
                        console.log(d);
                        console.log(arra[d]);
                        stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                    }
                    for (const match of stepcopy.url.matchAll(/{{(.*)#(.*)}}/g)) {
                        console.log(match)
                    }
                    sendPlain(req, res, "{" + await getJSON(pathwithnum, params['dt'], params['file']) + "}");
                }
            }
        }
    }
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
            if (!loadFile(params['file'])) {
                sendHTML(req, res, readFileContentSync("/internal/project.txt")
                    .replace("<!--NAME-->", "Error reading file"));
                return;
            }
            loadDB(params['file']);

            let tree = [];

            for (let tsnumber in jsonObj[params['file']].testsuites) {
                var ts = jsonObj[params['file']].testsuites[tsnumber];
                var tsobj = {}
                tsobj.name = ts.name;
                tsobj.disabled = ts.disabled;
                tsobj.folders = []
                tsobj.files = []

                for (let tcnumber in ts.testcases) {
                    var tc = ts.testcases[tcnumber];

                    var tcobj = {}
                    tcobj.name = tc.name;
                    tcobj.disabled = tc.disabled;
                    tcobj.folders = []
                    tcobj.files = []

                    for (let stepnumber in tc.steps) {
                        var step = tc.steps[stepnumber];
                        var stepobj = {}
                        stepobj.name = step.name;
                        stepobj.disabled = step.disabled && step.disabled == true ? true : false;
                        tcobj.files.push(stepobj);
                    }
                    tsobj.folders.push(tcobj);
                }
                tree.push(tsobj);
            }
            sendHTML(req, res, readFileContentSync("/internal/project.txt")
                .replace("<!--FOLDERS_MENU-->",
                    readFileContentSync("/internal/project_folder.txt"))
                .replace("<!--TC-->", "<script>tree = " + JSON.stringify(tree) + ";</script>")
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
            parsePOSTforms(req, url.parse("/?" + body, true).query, res, jsonObj);
        });
        return;
    }

    let files = "";
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    for (filenumber in all_files) {
        if (all_files[filenumber].includes('.json.db')) continue;
        files += "<a href=?file=" + all_files[filenumber] + ">" + all_files[filenumber] + "</a><br>";
    }

    sendHTML(req, res, readFileContentSync("/internal/index.txt").replace("<!--FILES-->", files));
};

http2.createSecureServer({
    key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
    cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
}, onRequestHandler).listen(port, hostname, async () => {
    //    loadDB("12345678901234567890");
    //    let v = await db_all("12345678901234567890","SELECT sqlite_version();");
    console.log(`Server running at https://${hostname}:${port}/, Node.js ` + process.version);
    //JSON.stringify(v));
    //    console.log(path.normalize(__dirname + "/projects/12345678901234567890.db"));
});