//formatted with js-beautify -e "\n" requestor.js > x

const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const sqlite3 = require('sqlite3');
const tls = require('node:tls');
//const url = require('url');
const zlib = require('zlib');

const version = "20251023";
const hostname = '127.0.0.1';
const port = 3000;
const DB = false;
const maxDBResultsPerRequest = 500;
const fileHTMLLog = false;
const fileTXTLog = false;
const consoleLog = true;
const oldRun = 3; //days //not implemented

let jsonObj = [];
let dbObj = [];
let callback = [];
let sqLiteVersion = "";

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

function loadProjectFile(name) {
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

function getDateString(dt) {
    return dt.getFullYear() + "-" + digits(dt.getMonth() + 1, 2) + "-" +
        digits(dt.getDate(), 2) + " " + digits(dt.getHours(), 2) + ":" +
        digits(dt.getMinutes(), 2) + ":" + digits(dt.getSeconds(), 2) + " " +
        digits(dt.getMilliseconds(), 3);
}

function getEmptyResponse(errorInfo) {
    var resp = {}
    resp.body = '';
    resp.headers = [];
    resp.code = 0;
    resp.error = errorInfo;
    resp.certinfo = "";
    return resp;
}

async function executeRequest(req) {
    resperror = "";
    try {
        var q = new URL(req.url);
        } catch (e) {
    return new Promise((resolve, reject) => {
            var s = e.errors + " ";
            if (resperror) resperror += "\n";
            resperror += (s == 'undefined ' ? e.message : s);
            resolve(getEmptyResponse(resperror));
});
        }
    console.log(q);
    var certinfo = '';
    const options = {
        // hostname:q.hostname,
        // port:443,
        // path:q.path,
        // method:req.method
        // req.headers
        // key:
        // cert:
        agent: false
    };

    if (req.conLen) {
        req.headers["Content-Length"] = req.body.length;
    }

    var method2 = null;
    if (q.protocol == "http:") {
        method2 = req.method == "get" ? http.get : http.request;
    } else if (q.protocol == "https:") {
        method2 = req.method == "get" ? https.get : https.request;
        if (req.ignoreWrongSSL) options.rejectUnauthorized = false;
    }
    //fixme
    if (req.url.includes("{{") && req.url.includes("}}")) {
        resperror = "Unresolved params in url";
    }
    if (method2 == null) {
        if (resperror) resperror += "\n";
        resperror += "Error parsing url, supported http: and https: in this moment";
        return getEmptyResponse(resperror);
    }
    options.method = req.method;
    options.timeout = 3000;
    options.headers = req.headers;
    console.log("starting tc");
    return new Promise((resolve, reject) => {
        try {
            console.log("tc run");
            const r = method2(req.url, options, (response) => {
                const chunk = []
                console.log("tc run 2");
                try {
                    var cipher = r.socket.getCipher();
                    console.log("tc run 3");
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
                console.log("tc run 3");
                response.on('data', (fragments) => {
                    chunk.push(fragments);
                });
                response.on('end', () => {
                    var resp = {}
                    resp.body = Buffer.concat(chunk).toString();
                    resp.headers = response.headers;
                    resp.code = response.statusCode;
                    resp.error = resperror;
                    resp.certinfo = certinfo;
                    resolve(resp);
                });
            }).on('error', (e) => {
                console.log("tc run error 1");
                var s = e.errors + " ";
                if (resperror) resperror += "\n";
                resperror += (s == 'undefined ' ? e.message : s);
                resolve(getEmptyResponse(resperror));
            });
            if (req.method == "post") {
                r.write(req.body);
                r.end();
            }
        } catch (e) {
            console.log("tc run error 2");
            var s = e.errors + " ";
            if (resperror) resperror += "\n";
            resperror += (s == 'undefined ' ? e.message : s);
            resolve(getEmptyResponse(resperror));
        }
    });
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

async function addToRunReport(file, p, answer) {
    if (!fileTXTLog) return;
    a2 = answer;
    s = "Step '" + p + "'\nRequest " + a2.datetime + "\n" +
        a2.method + " " + a2.url + "\n";
    s += decodeURIComponent(a2.headers) + "\n";
    s += "\n" + decodeURIComponent(a2.body);
    s += "\n\n" +
        (a2.error == "" ? "Response " : "Error ") +
        a2.datetime_res + "\n" +
        (a2.cert_res == "" ? "" : decodeURIComponent(a2.cert_res) + "\n") +
        "HTTP code " + a2.code_res + "\n";
    s += decodeURIComponent(a2.headers_res) + "\n";
    s += "\n" + decodeURIComponent(a2.body_res) + "\n";
    s += "\n\n";
    fs.appendFile(path.normalize(__dirname + '/reports/' + file + '.txt'), s,
        function(err) {
            if (err) {
                //                return console.log(err);
            }
        });
}

async function addToRunReportHTML(file, p, answer) {
    if (!fileHTMLLog) return;
    a2 = answer;
    s = "<b>Step '" + p + "'</b><br>\n" +
        "<span class=req>" +
        "Request " + a2.datetime + "<br>\n" + a2.method.toUpperCase() + " <a href='" + a2.url + "'>" + a2.url + "</a><br>\n";
    if (a2.headers.length != 0 || a2.body.length != 0) s += "<pre>";
    s += decodeURIComponent(a2.headers);
    if (!a2.headers.endsWith("\n")) s += "\n";
    s += decodeURIComponent(a2.body);
    if (a2.headers.length != 0 || a2.body.length != 0) s += "</pre>";
    s += "</span><span class=resp>";
    s += "\n<br>";
    s += a2.errors === "" ? "Response " : "Error ";
    s += a2.datetime_res;
    if (a2.code_res != 0) s += " with HTTP code " + a2.code_res;
    s += "<br>\n";
    s += (a2.errors === "" ? "" : "<pre>" + decodeURIComponent(a2.errors) + "</pre>");
    s += (a2.cert_res === "" ? "" : "<span class=cert style='display:none'><pre>" +
        decodeURIComponent(a2.cert_res) + "</pre></span>\n");
    if (a2.headers_res.length != 0) s += "<pre>";
    s += decodeURIComponent(a2.headers_res);
    if (!a2.headers_res.endsWith("\n")) s += "\n";
    if (a2.headers_res.length != 0) s += "</pre>";
    if (a2.headers_res.includes("json")) {
        s += "<pre>" + decodeURIComponent(a2.body_res) + "</pre>";
    } else if (a2.body_res.length != 0) {
        s += "\n<a download='response.htm' href='data:text/html;base64," +
            Buffer.from(decodeURIComponent(a2.body_res)).toString('base64') + "'>Response</a>\n";
    }
    s += "</span>";
    s += "<hr>\n";
    fs.appendFile(path.normalize(__dirname + '/reports/' + file + '.htm'), s,
        function(err) {
            if (err) {
                //                return console.log(err);
            }
        });
}

async function sendCallback(file, type, msg) {
    for (let i in callback) {
        //console.log("   callback "+callback[i].file+" "+file);
        if (callback[i].file == file) {
            //console.log("   running callback "+callback[i].file+" "+type+" "+msg);
            x = {}
            for (const [name, value] of msg) {
                x[name] = value;
            }
            callback[i].res.write("event: " + type + "\n");
            callback[i].res.write("data: " + JSON.stringify(x) + "\n\n");
        }
    }
}

function findElement(jsonObj, pathString) {
    let elpath = pathString.split("/");
    let objobj = jsonObj.testsuites;
    let level = 1;
    while (true) {
        let found = false;
        for (let objnumber in objobj) {
            var singleobj = objobj[objnumber];
            if (elpath.length == level && singleobj.name == elpath[level - 1]) {
                retVal = [];
                retVal.type = level == 1 ? 'suite' : (level == 2 ? "tc" : "step");
                retVal.index = objnumber;
                retVal.parentarray = objobj;
                retVal.obj = singleobj;
                return retVal;
            } else if (elpath.length > level && singleobj.name == elpath[level - 1]) {
                level++;
                objobj = singleobj.children;
                found = true;
                break;
            }
        }
        if (found) continue;
        return null;
    }
}

async function createStepTree(file, obj) {
    var stepobj = {}
    stepobj.name = obj.name;
    stepobj.type = 'step';
    stepobj.disabled = obj.disabled && obj.disabled == true ? true : false;
    stepobj.status = '-';
    if (!stepobj.disabled) {
        if (obj.dbid) {
            let rows = await db_all(file, "SELECT dt,error_res from requests where dbid =\"" + obj.dbid + "\" order by dt desc");
            if (rows.length == 0) {
                stepobj.status = 'norun';
            } else if (rows[0].error_res.length == 0) {
                stepobj.status = 'ok';
            } else {
                stepobj.status = 'nok';
            }
        } else {
            stepobj.status = 'norun';
        }
    }
    return stepobj;
}

async function createTCTree(file, obj) {
    var tcobj = {}
    tcobj.name = obj.name;
    tcobj.type = 'tc';
    tcobj.disabled = obj.disabled;
    tcobj.folders = []
    tcobj.files = []
    tcobj.status = '-';
    for (let stepnumber in obj.children) {
        var step = obj.children[stepnumber];
        var x = await createStepTree(file, step);
        tcobj.files.push(x);
        if (!tcobj.disabled) {
            if (x.status === 'ok') {
                if (tcobj.status === '-') tcobj.status = 'ok';
            } else if (x.status === 'nok') {
                if (tcobj.status === "-" || tcobj.status === 'ok') tcobj.status = 'nok';
            } else if (x.status === 'norun') {
                tcobj.status = 'norun';
            }
        }
    }
    return tcobj;
}

async function createTSTree(file, obj) {
    var tsobj = {}
    tsobj.name = obj.name;
    tsobj.type = 'ts';
    tsobj.disabled = obj.disabled;
    tsobj.folders = []
    tsobj.files = []
    tsobj.status = '-';
    for (let tcnumber in obj.children) {
        var tc = obj.children[tcnumber];
        var x = await createTCTree(file, tc);
        tsobj.folders.push(x);
        if (!tsobj.disabled) {
            if (x.status === 'ok') {
                if (tsobj.status === '-') tsobj.status = 'ok';
            } else if (x.status === 'nok') {
                if (tsobj.status === '-' || tsobj.status === 'ok') tsobj.status = 'nok';
            } else if (x.status === 'norun') {
                tsobj.status = 'norun';
            }
        }
    }
    return tsobj;
}

async function loadDB(name) {
    if (!dbObj[name]) {
        dbObj[name] = new sqlite3.Database(path.normalize(__dirname + "/projects/" + name + ".db"), async (err) => {
            if (err) {
                console.log("DB error " + err);
                exit(1);
            }
            dbObj[name].exec(`
    create table requests (
    dt text not null,
    dbid text not null,
    method text not null,
    url text not null,
    headers text not null,
    body text not null,
    notes text not null,
    ssl_ignore smallint not null,
    cert_res text not null,
    error_res text,
    headers_res text not null,
    body_res text not null,
    code_res SMALLINT not null,
    dt_res text not null
    );`, () => {});
        });
        if (sqLiteVersion === "") {
            let v = await db_all(name, "SELECT sqlite_version();");
            sqLiteVersion = JSON.stringify(v);
            console.log(JSON.stringify(v));
        }
    }
}

function db_all(filename, sql) {
    return new Promise((resolve, reject) => {
        const q = [];
        dbObj[filename].each(sql, (err, row) => {
                if (err) reject(err);
                q.push(row);
            },
            (err, n) => {
                if (err) reject(err);
                resolve(q);
            });
    });
}

async function getJSON(dbid, dt, file) {
    let rows = await db_all(file, "SELECT * from requests where dbid =\"" + dbid + "\" and dt=\"" + decodeURIComponent(dt) + "\"");
    if (rows == null || rows[0] === undefined) {
        let s = "\"datetime\":\"\",";
        s += "\"datetime_res\":\"\",";
        s += "\"errors\":\"\",";
        s += "\"cert_res\":\"\",";
        s += "\"ssl_ignore\":\"false\",";
        s += "\"code_res\":\"\",";
        s += "\"url\":\"\",";
        s += "\"method\":\"GET\",";
        s += "\"headers\":\"\",";
        s += "\"body\":\"\",";
        s += "\"notes\":\"\",";
        s += "\"headers_res\":\"\","
        s += "\"body_res\":\"\"";
        return "{" + s + "}";
    }

    let s = "\"datetime\":\"" + decodeURIComponent(dt) + "\",";
    s += "\"datetime_res\":\"" + decodeURIComponent(rows[0].dt_res) + "\",";
    s += "\"errors\":\"" + encodeURIComponent(rows[0].error_res) + "\",";
    s += "\"cert_res\":\"" + encodeURIComponent(rows[0].cert_res) + "\",";
    s += "\"ssl_ignore\":\"" + rows[0].ssl_ignore + "\",";
    s += "\"code_res\":\"" + rows[0].code_res + "\",";
    s += "\"url\":\"" + rows[0].url + "\",";
    s += "\"method\":\"" + rows[0]["method"] + "\",";
    s += "\"headers\":\"" + encodeURIComponent(rows[0]["headers"]) + "\",";
    s += "\"body\":\"" + encodeURIComponent(rows[0]["body"]) + "\",";
    s += "\"notes\":\"" + encodeURIComponent(rows[0]["notes"]) + "\",";
    s += "\"headers_res\":\"" + encodeURIComponent(rows[0]["headers_res"]) + "\",";
    s += "\"body_res\":\"" + encodeURIComponent(rows[0]["body_res"]) + "\"";
    return "{" + s + "}";
}

function updateFolderStatus(file, path, oldstatus, newstatus) {
    console.log(path + " " + oldstatus + " " + newstatus);
    if (oldstatus != newstatus) {
        s = new URLSearchParams();
        s.set('file', file);
        s.set('path', path);
        s.set('status', newstatus);
        sendCallback(file, "updatefolderstatus", s);
    }
}

async function parsePOSTRenameElement(params, jsonObj) {
    el = findElement(jsonObj, params.get('path'));
    if (el != null) {
        el.obj.name = params.get('new');
        jsonObj.modified = true;
        sendCallback(params.get('file'), "renameelement", params);
    }
}

async function parsePOSTNewElement(params, jsonObj, createInside) {
    if (params.get('path') == "") {
        let newTS = {};
        newTS.name = params.get('new');
        newTS.children = [];
        jsonObj.testsuites.unshift(newTS);
        jsonObj.modified = true;
        sendCallback(params.get('file'), "newelement", params);
    } else {
        el = findElement(jsonObj, params.get('path'));
        if (el != null) {
            let elpath = params.get('path').split("/");
            let newElement = {};
            newElement.name = params.get('new');
            if (elpath.length == (createInside ? 2 : 3)) {
                newElement.method = "POST";
                newElement.headers = "";
                newElement.body = "";
                newElement.ignoreWrongSSL = true;
                newElement.conLen = true;
                newElement.url = "https://";
            } else if (elpath.length == (createInside ? 1 : 2)) {
                newElement.children = [];
                newElement.input = [];
            } else if (elpath.length == 1) {
                newElement.children = [];
            }
            if (createInside) {
                el.obj.children.unshift(newElement);
            } else {
                el.parentarray.splice(el.index, 0, newElement);
            }
            jsonObj.modified = true;
            sendCallback(params.get('file'), createInside ? "newelementinside" : "newelement", params);
        }
    }
}

async function parsePOSTEnableDisableElement(params, jsonObj) {
    el = findElement(jsonObj, params.get('path'));
    if (el != null) {
        let elpath = params.get('path').split("/");
        var x1_before = await createTSTree(params.get('file'),
            findElement(jsonObj, elpath[0]).obj);
        var x2_before = elpath.length > 2 ? await createTCTree(params.get('file'),
            findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj) : null;

        jsonObj.modified = true;
        if (el.obj.disabled == true) {
            delete el.obj.disabled;
        } else {
            el.obj.disabled = true;
        }

        sendCallback(params.get('file'), "enabledisableelement", params);

        var x1_after = await createTSTree(params.get('file'),
            findElement(jsonObj, elpath[0]).obj);
        var x2_after = elpath.length > 2 ? await createTCTree(params.get('file'),
            findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj) : null;

        if (x1_before != null) updateFolderStatus(params.get('file'), elpath[0], x1_before.status, x1_after.status);
        if (x2_before != null) updateFolderStatus(params.get('file'), elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
    }
}

async function parsePOSTDeleteElement(params, jsonObj) {
    //fixme delete from db
    el = findElement(jsonObj, params.get('path'));
    if (el != null) {
        let elpath = params.get('path').split("/");
        var x1_before = elpath.length > 1 ? await createTSTree(params.get('file'),
            findElement(jsonObj, elpath[0]).obj) : null;
        var x2_before = elpath.length > 2 ? await createTCTree(params.get('file'),
            findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj) : null;

        jsonObj.modified = true;
        el.parentarray.splice(el.index, 1);

        sss = params;
        sss.set('emptyafter', jsonObj.testsuites.length == 0);
        sendCallback(params.get('file'), "deleteelement", sss);

        var x1_after = elpath.length > 1 ? await createTSTree(params.get('file'),
            findElement(jsonObj, elpath[0]).obj) : null;
        var x2_after = elpath.length > 2 ? await createTCTree(params.get('file'),
            findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj) : null;

        if (x1_before != null) updateFolderStatus(params.get('file'), elpath[0], x1_before.status, x1_after.status);
        if (x2_before != null) updateFolderStatus(params.get('file'), elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
    }
}

async function parsePOSTSetData(params, jsonObj) {
    el = findElement(jsonObj, params.get('path'));
    if (el != null) {
        jsonObj.modified = true;
        el.obj.input = params.get('data').split("\n");
    }
}

async function parsePOSTSaveFile(params, jsonObj) {
    const lm = (await fs.promises.stat(path.normalize(__dirname + '/projects/' + params.get('file')))).mtime;

    fs.rename(
        path.normalize(__dirname + '/projects/' + params.get('file')),
        path.normalize(__dirname + '/projects/' + params.get('file') +
            getDateString(lm).replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "")),
        function(err) {});

    delete jsonObj.modified;
    jsonObj.format = "Created with Requestor " + version + " on " + getDateString(lm);
    fs.writeFile(path.normalize(__dirname + '/projects/' + params.get('file')),
        JSON.stringify(jsonObj, null, 2),
        function(err) {
            if (err) {}
        });

    x = new URLSearchParams();
    x.set('file', params.get('file'));
    x.set('modified', false);
    sendCallback(params.get('file'), "setenabledisablesave", x);
}

async function parsePOSTNewFile(req, filename, res) {
    if (fs.existsSync(path.normalize(__dirname + '/projects/' + filename + ".json"))) {
        sendPlain(req, res, "file exists");
    } else {
        fs.writeFile(path.normalize(__dirname + '/projects/' + filename + ".json"),
            "{ \"format\": \"created by requestor\",\"testsuites\": []}",
            function(err) {
                if (err) {
                    //                return console.log(err);
                }
            });
        sendPlain(req, res, "");
    }
}

function replaceArrayWithString(ar) {
    retVal = "";
    for (let arname in ar) {
        if (Array.isArray(ar[arname])) {
            for (let arx in ar[arname]) {
                if (retVal.length != 0) retVal += "\n";
                retVal += arname + ": " + ar[arname][ar];
            }
        } else {
            if (retVal.length != 0) retVal += "\n";
            retVal += arname + ": " + ar[arname];
        }
    }
    return retVal;
}

function replaceStringArrayWithArray(s) {
    retVal = {};
    for (let arname in s) {
        if (s[arname].indexOf(":") > 0) {
            nam = s[arname].substring(0, s[arname].indexOf(":"));
            val = s[arname].substring(s[arname].indexOf(":") + 1);
            if (retVal[nam] && !Array.isArray(retVal[nam])) {
                x = retVal.val;
                retVal[nam] = [];
                retVal[nam].push(x);
            }
            if (retVal[nam]) {
                retVal[nam].push(val);
            } else {
                retVal[nam] = val;
            }
        }
    }
    return retVal;
}

async function executeRequestAndSaveResults(req, res, times, filename, runpath, iteration, dt0, isLast) {
    let dt = new Date();
    let curDT = getDateString(dt);
    var response = await executeRequest(req);
    let curDT2 = getDateString(new Date());
    if (!req.dbid) req.dbid = getDateString(dt);

    dbObj[filename].run(`insert into requests (dt, dbid, url, headers,body,notes,headers_res,body_res,method,ssl_ignore,code_res,cert_res,dt_res,error_res) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        curDT, req.dbid, req.url, replaceArrayWithString(req.headers), req.body, req.notes, replaceArrayWithString(response.headers),
        response.body, req.method, req.ignoreWrongSSL, response.code, response.certinfo, curDT2, response.error,
        err => {
            console.log(err)
        });

    retVal = JSON.parse(await getJSON(req.dbid, curDT, filename));
    retVal.oldtimes = times;

    s = new URLSearchParams();
    s.set('file', filename);
    s.set('path', runpath);
    s.set('status', retVal.errors.length == 0 ? 'ok' : 'nok');
    sendCallback(filename, "updatefilestatus", s);

    if (isLast) {
        s = new URLSearchParams();
        for (indexx in retVal) {
            s.set(indexx, retVal[indexx]);
        }
        s.set('path', runpath);
        s.set('file', filename);
        sendCallback(filename, "runstep", s);
        retVal.path = runpath;
        retVal.file = filename;
    }

    s = new URLSearchParams();
    s.set('file', filename);
    s.set('info', "Executing " + runpath + (iteration == -1 ? "" : " iteration " + iteration));
    sendCallback(filename, "runner", s);

    addToRunReport(filename + dt0, runpath, retVal);
    addToRunReportHTML(filename + dt0, runpath, retVal);

    return retVal;
}

async function parsePOSTRun(req, params, res, jsonObj) {
    var sss = "";
    let times = [];
    let p = params.get('path').split("/");
    let dt = getDateString(new Date()).replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "");

    if (fileTXTLog) {
        fs.appendFile(path.normalize(__dirname + '/reports/' + params.get('file') + dt + '.txt'),
            "Run '" + params.get('path') + "'\n\n",
            function(err) {
                if (err) {}
            });
    }
    if (fileHTMLLog) {
        fs.appendFile(path.normalize(__dirname + '/reports/' + params.get('file') + dt + '.htm'),
            "<b>Run '" + params.get('path') + "'</b><hr>" +
            "<script>function hideshow(n) {all=document.getElementsByClassName(n);for (let i = 0; i < all.length; i++) {all[i].style.display=all[i].style.display=='none'?'block':'none';}}</script>" +
            "<input type=\"checkbox\" onclick='hideshow(\"cert\")'>Show certificate info" +
            "<input type=\"checkbox\" checked onclick='hideshow(\"req\")'>Show request info" +
            "<input type=\"checkbox\" checked onclick='hideshow(\"resp\")'>Show response info<hr>",
            function(err) {
                if (err) {}
            });
    }
    for (let tsnumber in jsonObj.testsuites) {
        var ts = jsonObj.testsuites[tsnumber];
        if (params.get('path') != "" && ts.name.localeCompare(p[0]) != 0) {
            continue;
        }
        var x1_before = await createTSTree(params.get('file'), ts);
        for (let tcnumber in ts.children) {
            var tc = ts.children[tcnumber];
            if (params.get('path') != "" && (p.length > 1 && tc.name.localeCompare(p[1]) != 0)) {
                continue;
            }
            var x2_before = await createTCTree(params.get('file'), tc);
            for (let stepnumber in tc.children) {
                var step = tc.children[stepnumber];
                if (tc.disabled && tc.disabled == true) {
                    continue;
                }
                if (params.get('path') != "" && (p.length == 3 && step.name.localeCompare(p[2]) != 0)) {
                    continue;
                }
                let lines = tc.input;
                if (params.get('method')) {
                    step.method = params.get('method');
                    xxxx = decodeURIComponent(params.get('headers'));
                    xxxx = xxxx.split("\n");
                    step.headers = [];
                    for (xyz in xxxx) step.headers.push(xxxx[xyz]);
                    step.body = decodeURIComponent(params.get('body'));
                    step.ignoreWrongSSL = params.get('ssl') == "true";
                    step.conLen = params.get('conlen') == "true";
                    step.url = decodeURIComponent(params.get('url'));
                    step.notes = decodeURIComponent(params.get('notes'));
                }
                if (step.notes == null) step.notes = "";
                runpath = ts.name + "/" + tc.name + "/" + step.name;

                if (lines.length == 0) {
                    var stepcopy = JSON.parse(JSON.stringify(step));
                    stepcopy.headers = replaceStringArrayWithArray(stepcopy.headers);
                    times.push((await executeRequestAndSaveResults(stepcopy, res, times, params.get('file'), runpath, -1, dt, true)).datetime);
                } else {
                    let iteration = 1;
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
                        var stepcopy = JSON.parse(JSON.stringify(step));
                        stepcopy.headers = replaceStringArrayWithArray(stepcopy.headers);
                        var replaced = false;
                        for (let d in arra) {
                            if (stepcopy.url.includes("{{" + d + "}}") || stepcopy.body.includes("{{" + d + "}}")) replaced = true;
                            stepcopy.url = stepcopy.url.replaceAll("{{" + d + "}}", arra[d]);
                            stepcopy.body = stepcopy.body.replaceAll("{{" + d + "}}", arra[d]);
                            for (let headername in stepcopy.headers) {
                                if (Array.isArray(stepcopy.headers[headername])) {
                                    for (let arx in stepcopy.headers[headername]) {
                                        if (stepcopy.headers[headername][arx].includes("{{" + d + "}}")) replaced = true;
                                        stepcopy.headers[headername][arx] =
                                            stepcopy.headers[headername][arx].replaceAll("{{" + d + "}}", arra[d]);
                                    }
                                } else {
                                    if (stepcopy.headers[headername].includes("{{" + d + "}}")) replaced = true;
                                    stepcopy.headers[headername] =
                                        stepcopy.headers[headername].replaceAll("{{" + d + "}}", arra[d]);
                                }
                            }
                        }
                        times.push((await executeRequestAndSaveResults(stepcopy, res, times, params.get('file'), runpath, iteration, dt, iteration == lines.length - 1 || !replaced)).datetime);
                        if (!replaced) break; //don't run more iterations, when we don't have params
                        iteration++;
                    }
                }
                step.dbid = stepcopy.dbid;
            }
            var x2_after = await createTCTree(params.get('file'), tc);
            updateFolderStatus(params.get('file'), ts.name + "/" + tc.name, x2_before.status, x2_after.status);
        }
        var x1_after = await createTSTree(params.get('file'), ts);
        updateFolderStatus(params.get('file'), ts.name, x1_before.status, x1_after.status);
    }

    s = new URLSearchParams();
    s.set('file', params.get('file'));
    s.set('info', "");
    sendCallback(params.get('file'), "runner", s);

    sendCallback("null", "mainrunner", null);

    jsonObj.modified = true;
    if (req != null) sendPlain(req, res, JSON.stringify(sss));
}

async function PasteElement(params, jsonObj, deleteDB, deleteOriginal) {
    let elpath = params.get('path').split("/"); //old path
    let elpath2 = params.get('newpath').split("/"); //new parent path

    var x1_before = await createTSTree(params.get('file'), findElement(jsonObj, elpath[0]).obj);
    if (elpath.length > 2) {
        var x2_before = await createTCTree(params.get('file'), findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj);
    }

    var x3_before = await createTSTree(params.get('file'), findElement(jsonObj, elpath2[0]).obj);
    if (elpath2.length > 1) {
        var x4_before = await createTCTree(params.get('file'), findElement(jsonObj, elpath2[0] + "/" + elpath2[1]).obj);
    }

    el = findElement(jsonObj, params.get('path'));
    if (deleteOriginal) {
        el.obj = JSON.parse(JSON.stringify(el.obj));
        el.parentarray.splice(el.index, 1);
    }
    if (deleteDB && el.obj.children) {
        for (let tcnumber in el.obj.children) {
            var tc = retVal.obj.children[tcnumber];
            if (tc.children) {
                for (let stepnumber in tc.children) {
                    delete tc.children[stepnumber].dbid;
                }
            }
        }
    }

    el2 = findElement(jsonObj, params.get('newpath'));
    tree = [];
    if (el != null && el2 != null) {
        let newObj = JSON.parse(JSON.stringify(el.obj));
        if (elpath.length != elpath2.length) {
            if (elpath2.length == 1 || elpath2.length == 2) {
                while (true) {
                    found = false;
                    for (let tcnumber in el2.obj.children) {
                        var tc = el2.obj.children[tcnumber];
                        if (tc.name === newObj.name) {
                            newObj.name = newObj.name + "(copy)";
                            found = true;
                        }
                    }
                    if (!found) break;
                }
                el2.obj.children.unshift(newObj);
            }
        } else {
            while (true) {
                found = false;
                for (let xnumber in el2.parentarray) {
                    var x = el2.parentarray[xnumber];
                    if (x.name === newObj.name) {
                        newObj.name = newObj.name + "(copy)";
                        found = true;
                    }
                }
                if (!found) break;
            }
            el2.parentarray.splice(el2.index, 0, newObj);
        }

        tree.push(el.type == 'suite' ?
            await createTSTree(params.get('file'), newObj) :
            (el.type == 'tc' ?
                await createTCTree(params.get('file'), newObj) :
                await createStepTree(params.get('file'), newObj))
        );

        jsonObj.modified = true;
        params.set('struct', JSON.stringify(tree));
        sendCallback(params.get('file'), "pastedrop", params);

        var x1_after = await createTSTree(params.get('file'), findElement(jsonObj, elpath[0]).obj);
        updateFolderStatus(params.get('file'), elpath[0], x1_before.status, x1_after.status);
        if (elpath.length > 2) {
            var x2_after = await createTCTree(params.get('file'), findElement(jsonObj, elpath[0] + "/" + elpath[1]).obj);
            updateFolderStatus(params.get('file'), elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
        }

        var x3_after = await createTSTree(params.get('file'), findElement(jsonObj, elpath2[0]).obj);
        updateFolderStatus(params.get('file'), elpath2[0], x3_before.status, x3_after.status);
        if (elpath2.length > 1) {
            var x4_after = await createTCTree(params.get('file'), findElement(jsonObj, elpath2[0] + "/" + elpath2[1]).obj);
            updateFolderStatus(params.get('file'), elpath2[0] + "/" + elpath2[1], x4_before.status, x4_after.status);
        }
    }
}

async function parsePOSTGetStep(req, params, res, jsonObj) {
    el = findElement(jsonObj, params.get('path'));
    if (el != null && el.type === 'step') {
        sendPlain(req, res, await getJSON(el.obj.dbid, params.get('dt'), params.get('file')));
    }
}

function prepareJSONFromYAML(info, linenr, level) {
    let YAMLobj2 = [];
    let line = linenr;
    let description = false;
    let name = "";
    while (true) {
        if (line >= info.length) {
            let xx = [];
            xx.line = line;
            xx.yaml = YAMLobj2;
            return xx;
        }
        let x = info[line].replace(/^( )+/, "");
        if (info[line].length - x.length < level) {
            let xx = [];
            xx.line = line;
            xx.yaml = YAMLobj2;
            return xx;
        } else if (info[line].length - x.length == level) {
            description = false;
            let ind = x.indexOf(":");
            name = x.substring(0, ind);
            if (name.startsWith("- ")) name = name.substring(2);
            if (x.length - 1 == ind) {
                let xx = prepareJSONFromYAML(info, line + 1,
                    info[line].length - x.length + 2);
                line = xx.line;
                YAMLobj2[name] = xx.yaml;
                continue;
            } else if (x.length != 0) {
                description = x.includes("|-");
                if (description) {
                    YAMLobj2[name] = "";
                } else {
                    YAMLobj2[name] = x.substring(ind + 2).replaceAll("'", ""); //fixme
                }
            }
        } else {
            if (description) {
                YAMLobj2[name] += info[line];
            } else if (x.length != 0) {
                let ind = x.indexOf(":");
                name = x.substring(0, ind);
                if (name.startsWith("- ")) name = name.substring(2); //fixme - array instead
                let xx = prepareJSONFromYAML(info, line + 1,
                    info[line].length - x.length + 2);
                line = xx.line;
                YAMLobj2[name] = xx.yaml;
                continue;
            }
        }
        line++;
    }
}

function generateJSONObjectFromYAML(yaml, section) {
    let obj = {};
    let sec = section.replace("#/components/schemas/", "").replaceAll("'", "");
    console.log("starting section " + section + " " + sec + "");
    if (yaml.components.schemas[sec]) {
        for (propertyIndex in yaml.components.schemas[sec].properties) {
            let prop = yaml.components.schemas[sec].properties[propertyIndex];
            console.log("property ");
            console.log(prop);
            if (prop.$ref) {
                obj[propertyIndex] = generateJSONObjectFromYAML(yaml, prop.$ref);
            } else if (prop.type === "integer") {
                obj[propertyIndex] = prop.example ? Number(prop.example) : 0;
            } else if (prop.type === "string") {
                if (prop.enum) {
                    obj[propertyIndex] = "" + prop.enum[0];
                } else {
                    obj[propertyIndex] = prop.example ? "" + prop.example : "";
                }
            } else if (prop.type === "array") {
                obj[propertyIndex] = {};
                if (prop.items.$ref) {
                    obj[propertyIndex][0] = generateJSONObjectFromYAML(yaml, prop.items.$ref);
                }
            }
        }
    }
    return obj;
}

async function parsePOSTImport(req, params, res, jsonObj) {
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    let info = "";
    let info2 = "";
    let level = 0;
    for (filenumber in all_files) {
        if (!all_files[filenumber].endsWith('.yaml')) continue;
        info = (readFileContentSync("/projects/" + all_files[filenumber])
            .replace(/\t/g, "    ")
            .split(/\r\n|\r|\n/g));
    }
    let YAMLobj = prepareJSONFromYAML(info, 0, 0).yaml;
    console.log(YAMLobj);

    params.set("path", jsonObj.testsuites[0].name);
    params.set('new', "new testsuite");
    params.set("newElementPath", "new testsuite");
    params.set("elplen", "1");
    params.set("op", "newelement");
    let newTS = {};
    newTS.name = "new testsuite";
    newTS.children = [];
    jsonObj.testsuites.unshift(newTS);
    jsonObj.modified = true;
    sendCallback(params.get('file'), "newelement", params);

    for (pathIndex in YAMLobj.paths) {
        for (methodIndex in YAMLobj.paths[pathIndex]) {
            let TC = YAMLobj.paths[pathIndex][methodIndex];

            let newTC = {};
            newTC.name = TC.operationId;
            newTC.children = [];
            newTC.input = [];
            newTS.children.push(newTC);
            params.set("op", "newelementinside");
            params.set('new', TC.operationId);
            params.set("path", "new testsuite");
            params.set("newElementPath", "new testsuite/" + TC.operationId);
            params.set("elplen", "1");
            sendCallback(params.get('file'), "newelementinside", params);

            let body = null;
            if (TC.requestBody) {
                for (contentIndex in TC.requestBody.content) {
                    if (contentIndex === "application/json") {
                        body = generateJSONObjectFromYAML(YAMLobj,
                            TC.requestBody.content[contentIndex].schema.$ref ?
                            TC.requestBody.content[contentIndex].schema.$ref :
                            TC.requestBody.content[contentIndex].schema.items.$ref);
                    }
                }
            }

            console.log(body);
            let newStep = {};
            newStep.name = TC.operationId;
            newStep.method = methodIndex.toUpperCase();
            newStep.headers = ["content-type: application/json"];
            newStep.body = body == null ? "" : JSON.stringify(body, null, 2);
            newStep.ignoreWrongSSL = true;
            newStep.notes = (TC.summary ? TC.summary : "") + "\n" + (TC.description && TC.description != TC.summary ? TC.description : "");
            newStep.conLen = true;
            newStep.url = YAMLobj.servers.url + pathIndex;
            newTC.children.push(newStep);
            params.set('new', TC.operationId);
            params.set("path", "new testsuite/" + TC.operationId);
            params.set("newElementPath", "new testsuite/" + TC.operationId + "/" + TC.operationId);
            params.set("elplen", "2");
            params.set("op", "newelementinside");
            sendCallback(params.get('file'), "newelementinside", params);
        }
    }
}

async function parsePOSTforms(req, params, res, jsonObj) {
    if (consoleLog) console.log(JSON.parse(JSON.stringify(params)));
    if (params.get("reportpage")) {
        sendPlain(req, res, await getReportPage(parseInt(params.get('reportpage'))));
        return;
    }
    if (params.get("filepage")) {
        sendPlain(req, res, await getProjectPage(parseInt(params.get('filepage'))));
        return;
    }
    if (params.get("op") == "newfile") {
        return parsePOSTNewFile(req, params.get('name'), res);
    }
    loadDB(params.get('file'));
    if (!(params.get('file') && fs.existsSync(
            path.normalize(__dirname + "/projects/" + params.get('file'))))) {
        sendPlain(req, res, "");
        return;
    }
    if (!jsonObj[params.get('file')]) {
        loadProjectFile(params.get('file'));
    }
    executed = true;
    if (params.get('op') == "run") {
        return parsePOSTRun(req, params, res, jsonObj[params.get('file')]);
    } else if (params.get('op') == "getstep" && params.get("dt")) {
        return parsePOSTGetStep(req, params, res, jsonObj[params.get('file')]);
    } else if (params.get('op') == "import") {
        return parsePOSTImport(req, params, res, jsonObj[params.get('file')]);
    } else if (params.get('op') == "savefile") {
        parsePOSTSaveFile(params, jsonObj[params.get('file')]);
    } else if (params.get('op') == "newelement") {
        parsePOSTNewElement(params, jsonObj[params.get('file')], false);
    } else if (params.get('op') == "newelementinside") {
        parsePOSTNewElement(params, jsonObj[params.get('file')], true);
    } else if (params.get('op') == "pasteelement") {
        PasteElement(params, jsonObj[params.get('file')], true, false);
    } else if (params.get('op') == "dropelement") {
        PasteElement(params, jsonObj[params.get('file')], false, true);
    } else if (params.get('op') == "renameelement") {
        parsePOSTRenameElement(params, jsonObj[params.get('file')]);
    } else if (params.get('op') == "enabledisableelement") {
        parsePOSTEnableDisableElement(params, jsonObj[params.get('file')]);
    } else if (params.get('op') == "deleteelement") {
        parsePOSTDeleteElement(params, jsonObj[params.get('file')]);
    } else if (params.get('op') == "setdata" && params.get("data")) {
        parsePOSTSetData(params, jsonObj[params.get('file')]);
    } else {
        executed = false;
    }
    if (executed) {
        sendPlain(req, res, "");
        return;
    }
    el = findElement(jsonObj[params.get('file')], params.get('path'));
    if (el == null) {
        sendPlain(req, res, "");
        return;
    }
    if (el.type === 'suite') {
        sendPlain(req, res, readFileContentSync("/internal/proj_ts.txt")
            .replace("<!--NAME-->", el.obj.name));
    } else if (el.type === 'tc') {
        var xxxx = "<script>var csvData =`";
        for (var inputnumber in el.obj.input) {
            xxxx += el.obj.input[inputnumber] + "\n";
        }
        xxxx += "`;</script>";
        sendPlain(req, res, readFileContentSync("/internal/proj_tc.txt")
            .replace("<!--NAME-->", el.obj.name)
            .replace("<!--DATA-->", xxxx));
    } else if (el.type === 'step') {
        object = readFileContentSync("/internal/proj_step.txt")
            .replace("<!--NAME-->", el.obj.name)
            .replace("<!--URL-->", el.obj.url);
        if (el.obj.urlprefix) object = object.replace("<!--URLPREFIX-->", el.obj.urlprefix);
        var xxxx = "";
        first = true;
        console.log(el.obj.headers);
        for (var headernumber in el.obj.headers) {
            if (!first) xxxx += "\n";
            first = false;
            xxxx += el.obj.headers[headernumber];
        }
        object = object.replace("<!--HEADER-->", xxxx);
        var xxxx = "";
        for (var bodynumber in el.obj.body) {
            xxxx += el.obj.body[bodynumber];
        }
        object = object.replace("<!--BODY-->", xxxx);
        var xxxx = "";
        for (var notesnumber in el.obj.notes) {
            xxxx += el.obj.notes[notesnumber];
        }
        object = object.replace("<!--NOTES-->", xxxx)
            .replace("<!--SSLIGNORE-->", el.obj.ignoreWrongSSL ? "checked" : "")
            .replace("<!--CONLENGTH-->", el.obj.conLen ? "checked" : "")
            .replace("<!--METHOD-->", el.obj.method);
        var xxxx = "";
        if (el.obj.dbid) {
            let rows = await db_all(params.get('file'), "SELECT dt from requests where dbid =\"" + el.obj.dbid + "\" order by dt desc");
            var num = 0;
            var del = "";
            for (let row in rows) {
                xxxx += "<option value=\"" + rows[row].dt + "\">" + rows[row].dt + "</option>";
                if (num == maxDBResultsPerRequest) {
                    if (del != "") del += ",";
                    del += "'" + rows[row].dt + "'";
                } else {
                    num++;
                }
            }
            if (del != "") {
                await db_all(params.get('file'), "DELETE from requests where dbid  =\"" + el.obj.dbid + "\" and dt in (" + del + ")");
            }
            object = object.replace("<!--WHENLAST-->", xxxx);
        }
        sendPlain(req, res, object);
    }
}

const onRequestHandler = async (req, res) => {
    if (req.method === 'GET') {
        console.log(req);
        const params = (new URL(req.scheme + '://' + req.authority + req.url)).searchParams;
        if (consoleLog) console.log(JSON.parse(JSON.stringify(params)));
        if (params.get("sse")) { // PUSH functionality
            res.writeHead(200, {
                'Cache-Control': 'no-cache',
                'Content-Type': 'text/event-stream'
            });
            const session = crypto.randomBytes(32).toString('base64');
            x = [];
            x.file = params.get('file');
            x.res = res;
            //                        console.log("registering SSE " + x);
            callback[session] = x;
            if (params.get('file') != null && jsonObj[params.get('file')]) {
                x = new URLSearchParams();
                x.set('file', params.get('file'));
                x.set('modified', jsonObj[params.get('file')].modified ? true : false);
                sendCallback(params.get('file'), "setenabledisablesave", x);
            }
            res.on('close', function() {
                delete callback[session];
            });
            return;
        }
        var l = ["split.min.js", "split.min.js.map", "tabulator.min.js", "tabulator.min.js.map", "tabulator_midnight.min.css.map", "tabulator_midnight.min.css"];
        for (u in l) {
            if (req.url == "/external/" + l[u]) {
                if (l[u].endsWith("min.css")) {
                    sendCSS(req, res, readFileContentSync("/external/" + l[u]));
                } else {
                    sendJS(req, res, readFileContentSync("/external/" + l[u]));
                }
                return;
            }
        }
        if (params.get('report') &&
            (fs.existsSync(path.normalize(__dirname + "/reports/" + params.get('report'))) && params.get('report').includes('.htm') ||
                fs.existsSync(path.normalize(__dirname + "/reports/" + params.get('report'))) && params.get('report').includes('.txt'))) {
            sendHTML(req, res, readFileContentSync("/reports/" + params.get('report')));
            return;
        }

        let deletefromdb = false;
        if (params.get('file') && fs.existsSync(
                path.normalize(__dirname + "/projects/" + params.get('file')))) {
            deletefromdb = (!jsonObj[params.get('file')]);

            if (!loadProjectFile(params.get('file'))) {
                sendHTML(req, res, readFileContentSync("/internal/proj.txt")
                    .replace("<!--NAME-->", "Error reading file"));
                return;
            }
            loadDB(params.get('file'));

            let tree = [];
            for (let tsnumber in jsonObj[params.get('file')].testsuites) {
                var ts = jsonObj[params.get('file')].testsuites[tsnumber];
                var x = await createTSTree(params.get('file'), ts);
                tree.push(x);
            }

            if (deletefromdb) {
                let alldbid = "'abc'";
                for (let tsnumber in jsonObj[params.get('file')].testsuites) {
                    var ts = jsonObj[params.get('file')].testsuites[tsnumber];
                    for (let tcnumber in ts.children) {
                        var tc = ts.children[tcnumber];
                        for (let stepnumber in tc.children) {
                            var step = tc.children[stepnumber];
                            if (step.dbid) {
                                alldbid += ",'" + step.dbid + "'";
                            }
                        }
                    }
                }
                dbObj[params.get('file')].run(`delete from requests where dbid not in (` + alldbid + `)`,
                    err => {});
            }
            sendHTML(req, res, readFileContentSync("/internal/proj.txt")
                .replace("<!--JSLIB-->",
                    readFileContentSync("/internal/libjs.txt"))
                .replace("<!--FOLDERS_MENU-->",
                    readFileContentSync("/internal/proj_folder.txt"))
                .replace("<!--VERSION-->", version + " (GPLv3)")
                .replace("<!--TC-->", "<script>tree = " + JSON.stringify(tree) + ";</script>")
                .replace("<!--NAME-->", params.get('file')));
            return;
        }
    } else if (req.headers['content-type'] == "application/x-www-form-urlencoded") { // POST
        let body = "";
        req.on('data', function(data) {
            body += data;
            if (body.length > 1e6 * 6) req.connection.destroy(); // 6 MB
        });
        req.on('end', function() {
            console.log(req);
            parsePOSTforms(req, (new URL(req.scheme+"://"+req.authority+req.url+"/?" + body)).searchParams, res, jsonObj);
        });
        return;
    }

    //index file
    sendHTML(req, res, readFileContentSync("/internal/index.txt")
        .replace("<!--VERSION-->", version + " (GPLv3)")
        .replace("<!--FILES-->", await getProjectPage(0))
        .replace("<!--EXEC-->", await getReportPage(0))
        .replace("<!--JSLIB-->", readFileContentSync("/internal/libjs.txt")));
};

async function getProjectPage(pagenum) {
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    let all_files_arr = [];
    for (filenumber in all_files) {
        if (!all_files[filenumber].endsWith('.json')) continue;
        let x = [];
        x.fname = all_files[filenumber]; // + " (" + getDateString(lm) + ")";
        x.mtime = (await fs.promises.stat(path.normalize(__dirname + '/projects/' + all_files[filenumber]))).mtime;
        all_files_arr.push(x);
    }
    all_files_arr.sort(filesort());
    return showbox(all_files_arr, pagenum, "file");
}

async function getReportPage(pagenum) {
    let all_files2 = fs.readdirSync(path.normalize(__dirname + "/reports/"));
    let all_files_arr2 = [];
    for (filenumber in all_files2) {
        if (!all_files2[filenumber].endsWith('.htm') && !all_files2[filenumber].endsWith('.txt')) continue;
        const lm = (await fs.promises.stat(path.normalize(__dirname + '/reports/' + all_files2[filenumber]))).mtime;
        let x = [];
        x.fname = all_files2[filenumber];
        x.mtime = (await fs.promises.stat(path.normalize(__dirname + '/reports/' + all_files2[filenumber]))).mtime;
        all_files_arr2.push(x);
    }
    all_files_arr2.sort(filesort());
    return showbox(all_files_arr2, pagenum, "report");
}

function filesort() {
    return function(a, b) {
        if (a.mtime > b.mtime) return -1;
        if (a.mtime < b.mtime) return 1;
        return 0;
    }
}

function showbox(arr, pagenum, prefix) {
    number = arr.length / 10;
    out = "<div id='" + prefix + "'>";
    i = 0;
    if (pagenum <= number) {
        for (arrnumber in arr) {
            i++;
            if (i <= pagenum * 10) continue;
            out += "<a href='?" + prefix + "=" + arr[arrnumber].fname + "'>" +
                arr[arrnumber].fname +
                " (" + getDateString(arr[arrnumber].mtime) + ")</a><br>";
            if (i > pagenum * 10 + 9) break;
        }
        for (j = 0; j < number; j++) {
            out += "<a onclick='loadBoxPart(\"" + prefix + "page=" + j + "\",\"" + prefix + "\");return false;'>" + j + "</a> ";
        }
        out += "</div>";
    }
    return out;
}

if (process.argv.length === 3 || process.argv.length === 4) {
    if (!fs.existsSync(
            path.normalize(__dirname + "/projects/" + process.argv[2]))) {
        console.log("File '" + process.argv[3] + "' does not exist");
        return;
    }
    loadProjectFile(process.argv[2]);
    loadDB(process.argv[2]);
    params = new URLSearchParams();
    params.append('file', process.argv[2]);
    params.append('path', process.argv.length === 4 ? process.argv[3] : "");
    parsePOSTRun(null, params, null, jsonObj[process.argv[2]]);
} else if (process.argv.length === 2) {
    http2.createSecureServer({
        key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
        cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
    }, onRequestHandler).listen(port, hostname, async () => {
        console.log(`Server running at https://${hostname}:${port}/, Node.js ` + process.version);
    });
}