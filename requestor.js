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
const url = require('url');
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

async function executeRequest(req) {
    var q = url.parse(req.url, true);
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
    var x = req.headers;

    var method2 = null;
    if (q.protocol == "http:") {
        method2 = req.method == "get" ? http.get : http.request;
    } else if (q.protocol == "https:") {
        method2 = req.method == "get" ? https.get : https.request;
        if (req.ignoreWrongSSL) options.rejectUnauthorized = false;
    }
    resperror = "";
    if (req.url.includes("{{") && req.url.includes("}}")) {
        if (resperror) {
            resperror += "\n";
        }
        resperror += "Unresolved params";
    }
    if (method2 == null) {
        var resp = {}
        resp.body = '';
        resp.headers = [];
        resp.code = 0;
        if (resperror) {
            resperror += "\n";
        }
        resperror += "Error parsing url, supported http: and https: in this moment";
        resp.error = resperror;
        resp.certinfo = "";
        return (resp);
    }
    options.method = req.method;
    options.timeout = 3000;
    return new Promise((resolve, reject) => {
        try {
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
		    req.headers = x;
                    var resp = {}
                    resp.body = Buffer.concat(chunk).toString();
                    resp.headers = response.headers;
                    resp.code = response.statusCode;
                    resp.error = resperror;
                    resp.certinfo = certinfo;
                    resolve(resp);
                });
            }).on('error', (e) => {
		    req.headers = x;
                var s = e.errors + " ";
                var resp = {}
                resp.body = '';
                resp.headers = [];
                resp.code = 0;
                if (resperror) {
                    resperror += "\n";
                }
                resperror += (s == 'undefined ' ? e.message : s);
                resp.error = resperror;
                resp.certinfo = certinfo;
                resolve(resp);
            });
            if (req.method == "post") {
                r.write(req.body);
                r.end();
            }
        } catch (e) {
		    req.headers = x;
            var resp = {}
            resp.body = '';
            resp.headers = [];
            resp.code = 0;
            var s = e.errors + " ";
            if (resperror) {
                resperror += "\n";
            }
            resperror += (s == 'undefined ' ? e.message : s);
            resp.error = resperror;
            resp.certinfo = "";
            resolve(resp);
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
            callback[i].res.write("event: " + type + "\n");
            callback[i].res.write("data: " + msg + "\n\n");
        }
    }
}

function findElement(jsonObj, params, pathString) {
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
        s += "\"headers_res\":\"\","
        s += "\"body_res\":\"\"";
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
    s += "\"headers\":\"" + encodeURIComponent(rows[0]["headers"]) + "\",";
    s += "\"body\":\"" + encodeURIComponent(rows[0]["body"]) + "\",";
    s += "\"headers_res\":\"" + encodeURIComponent(rows[0]["headers_res"]) + "\",";
    s += "\"body_res\":\"" + encodeURIComponent(rows[0]["body_res"]) + "\"";
    return s;
}

function updateFolderStatus(file, path, oldstatus, newstatus) {
    if (oldstatus != newstatus) {
        s = {};
        s['file'] = file;
        s['path'] = path;
        s['status'] = newstatus;
        sendCallback(file, "updatefolderstatus", JSON.stringify(s));
    }
}

async function parsePOSTRenameElement(params, jsonObj) {
    el = findElement(jsonObj, params, params['path']);
    if (el != null) {
        el.obj.name = params['new'];
        jsonObj.modified = true;
        sendCallback(params['file'], "renameelement", JSON.stringify(params));
    }
}

async function parsePOSTNewElement(params, jsonObj, createInside) {
    if (params['path'] == "") {
        let newTS = {};
        newTS.name = params["new"];
        newTS.children = [];
        jsonObj.testsuites.unshift(newTS);
        jsonObj.modified = true;
        sendCallback(params['file'], "newelement", JSON.stringify(params));
    } else {
        el = findElement(jsonObj, params, params['path']);
        if (el != null) {
            let elpath = params['path'].split("/");
            let newElement = {};
            newElement.name = params["new"];
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
            sendCallback(params['file'], createInside ? "newelementinside" : "newelement", JSON.stringify(params));
        }
    }
}

async function parsePOSTEnableDisableElement(params, jsonObj) {
    el = findElement(jsonObj, params, params['path']);
    if (el != null) {
        let elpath = params['path'].split("/");
        var x1_before = await createTSTree(params['file'],
            findElement(jsonObj, params, elpath[0]).obj);
        var x2_before = elpath.length > 2 ? await createTCTree(params['file'],
            findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj) : null;

        jsonObj.modified = true;
        if (el.obj.disabled == true) {
            delete el.obj.disabled;
        } else {
            el.obj.disabled = true;
        }
        sendCallback(params['file'], "enabledisableelement", JSON.stringify(params));

        var x1_after = await createTSTree(params['file'],
            findElement(jsonObj, params, elpath[0]).obj);
        var x2_after = elpath.length > 2 ? await createTCTree(params['file'],
            findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj) : null;

        if (x1_before != null) updateFolderStatus(params['file'], elpath[0], x1_before.status, x1_after.status);
        if (x2_before != null) updateFolderStatus(params['file'], elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
    }
}

async function parsePOSTDeleteElement(params, jsonObj) {
    //fixme delete from db
    el = findElement(jsonObj, params, params['path']);
    if (el != null) {
        let elpath = params['path'].split("/");
        var x1_before = elpath.length > 1 ? await createTSTree(params['file'],
            findElement(jsonObj, params, elpath[0]).obj) : null;
        var x2_before = elpath.length > 2 ? await createTCTree(params['file'],
            findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj) : null;

        jsonObj.modified = true;
        el.parentarray.splice(el.index, 1);

        sss = params;
        sss['emptyafter'] = jsonObj.testsuites.length == 0;
        sendCallback(params['file'], "deleteelement", JSON.stringify(sss));

        var x1_after = elpath.length > 1 ? await createTSTree(params['file'],
            findElement(jsonObj, params, elpath[0]).obj) : null;
        var x2_after = elpath.length > 2 ? await createTCTree(params['file'],
            findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj) : null;

        if (x1_before != null) updateFolderStatus(params['file'], elpath[0], x1_before.status, x1_after.status);
        if (x2_before != null) updateFolderStatus(params['file'], elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
    }
}

async function parsePOSTSetData(params, jsonObj) {
    el = findElement(jsonObj, params, params['path']);
    if (el != null) {
        jsonObj.modified = true;
        el.obj.input = params['data'].split("\n");
    }
}

async function parsePOSTSaveFile(params, jsonObj) {
    const lm = (await fs.promises.stat(path.normalize(__dirname + '/projects/' + params['file']))).mtime;

    fs.rename(
        path.normalize(__dirname + '/projects/' + params['file']),
        path.normalize(__dirname + '/projects/' + params['file'] +
            getDateString(lm).replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "")),
        function(err) {
            //            if (err) console.log('ERROR: ' + err);
        });

    delete jsonObj.modified;
    jsonObj.format = "Created with Requestor " + version + " on " + getDateString(lm);
    fs.writeFile(path.normalize(__dirname + '/projects/' + params['file']),
        JSON.stringify(jsonObj, null, 2),
        function(err) {
            if (err) {
                //            return console.log(err);
            }
        });

    x = {};
    x.file = params['file'];
    x.modified = false;
    sendCallback(params['file'], "setenabledisablesave", JSON.stringify(x));
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

function replaceStringWithArray(s) {
    ar = s.split("\n");
    ar = ar.filter(function(el) {
                        return el.length > 0;
                    });
    retVal = {};
    for (let arname in ar) {
	if (ar[arname].indexOf(":")!=0) {
	    nam = ar[arname].substring(0,ar[arname].indexOf(":"));
	    val = ar[arname].substring(ar[arname].indexOf(":")+1);
	    if (retVal[nam] && !Array.isArray(retval[nam])) {
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

async function executeRequestAndSaveResults(req, res, times, filename, runpath, iteration, dt0) {
    let dt = new Date();
    let curDT = getDateString(dt);
    var response = await executeRequest(req);
    let curDT2 = getDateString(new Date());
    if (!req.dbid) req.dbid = getDateString(dt);
    dbObj[filename].run(`insert into requests (dt, dbid, url, headers,body,headers_res,body_res,method,ssl_ignore,code_res,cert_res,dt_res,error_res) values(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        curDT, req.dbid, req.url, replaceArrayWithString(req.headers), req.body, replaceArrayWithString(response.headers), 
        response.body, req.method, req.ignoreWrongSSL, response.code, response.certinfo, curDT2, response.error,
        err => {});

    retVal = JSON.parse("{" + await getJSON(req.dbid, curDT, filename) + "}");
    retVal.oldtimes = times;

    s = {};
    s['file'] = filename;
    s['path'] = runpath;
    s['status'] = retVal.errors.length == 0 ? 'ok' : 'nok';
    sendCallback(filename, "updatefilestatus", JSON.stringify(s));

    retVal.path = runpath;
    retVal.file = filename;
    sendCallback(filename, "runstep", JSON.stringify(retVal));

    s = {};
    s['file'] = filename;
    s['info'] = "Executing " + runpath + (iteration == -1 ? "" : " iteration " + iteration);
    sendCallback(filename, "runner", JSON.stringify(s));

    addToRunReport(filename + dt0, runpath, retVal);
    addToRunReportHTML(filename + dt0, runpath, retVal);

    return retVal;
}

async function parsePOSTRun(req, params, res, jsonObj) {
    var sss = "";
    let times = [];
    let p = params['path'].split("/");
    let dt = getDateString(new Date()).replaceAll("-", "").replaceAll(":", "").replaceAll(" ", "");

    if (fileTXTLog) {
        fs.appendFile(path.normalize(__dirname + '/reports/' + params['file'] + dt + '.txt'),
            "Run '" + params['path'] + "'\n\n",
            function(err) {
                if (err) {}
            });
    }
    if (fileHTMLLog) {
        fs.appendFile(path.normalize(__dirname + '/reports/' + params['file'] + dt + '.htm'),
            "<b>Run '" + params['path'] + "'</b><hr>" +
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
        if (params['path'] == "" || ts.name.localeCompare(p[0]) == 0) {} else {
            continue;
        }
        var x1_before = await createTSTree(params['file'], ts);
        for (let tcnumber in ts.children) {
            var tc = ts.children[tcnumber];
            if (params['path'] != "" && p.length == 1 || (p.length > 1 && tc.name.localeCompare(p[1]) == 0)) {} else {
                continue;
            }
            var x2_before = await createTCTree(params['file'], tc);
            for (let stepnumber in tc.children) {
                var step = tc.children[stepnumber];
                if (tc.disabled && tc.disabled == true) {
                    continue;
                }
                if (params['path'] == "" || p.length < 3 || (p.length == 3 && step.name.localeCompare(p[2]) == 0)) {} else {
                    continue;
                }
                let lines = tc.input;
                if (params['method']) {
                    step.method = params['method'];
		    step.headers = replaceStringWithArray(decodeURIComponent(params['headers']));
                    step.body = decodeURIComponent(params['body']);
                    step.ignoreWrongSSL = params['ssl'] == "true";
                    step.conLen = params['conlen'] == "true";
                    step.url = decodeURIComponent(params['url']);
                }
                runpath = ts.name + "/" + tc.name + "/" + step.name;

                if (lines.length == 0) {
                    sss = await executeRequestAndSaveResults(step, res, times, params['file'], runpath, -1, dt);
                    times.push(sss.datetime);
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
                        for (let d in arra) {
                            stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                            stepcopy.body = stepcopy.body.replace("{{" + d + "}}", arra[d]);
                            for (let headername in stepcopy.headers) {
			        if (Array.isArray(stepcopy.headers[headername])) {
        			    for (let arx in stepcopy.headers[headername]) {
                            		stepcopy.headers[headername][arx] =
                                    stepcopy.headers[headername][arx].replace("{{" + d + "}}", arra[d]);
				    }
				} else {
                                stepcopy.headers[headername] =
                                    stepcopy.headers[headername].replace("{{" + d + "}}", arra[d]);
				}
                            }
                        }
                        sss = await executeRequestAndSaveResults(stepcopy, res, times, params['file'], runpath, iteration, dt);
                        times.push(sss.datetime);

                        iteration++;
                        step.dbid = stepcopy.dbid;
                    }
                }
            }
            var x2_after = await createTCTree(params['file'], tc);
            updateFolderStatus(params['file'], p[0] + "/" + p[1], x2_before.status, x2_after.status);
        }
        var x1_after = await createTSTree(params['file'], ts);
        updateFolderStatus(params['file'], p[0], x1_before.status, x1_after.status);
    }
    s = {};
    s['file'] = params['file'];
    s['info'] = "";
    sendCallback(params['file'], "runner", JSON.stringify(s));
    sendCallback("null", "mainrunner", "");
    jsonObj.modified = true;
    if (req != null) sendPlain(req, res, JSON.stringify(sss));
}

async function PasteElement(params, jsonObj, deleteDB, deleteOriginal) {
    let elpath = params['path'].split("/"); //old path
    let elpath2 = params['newpath'].split("/"); //new parent path

    var x1_before = await createTSTree(params['file'], findElement(jsonObj, params, elpath[0]).obj);
    if (elpath.length > 2) {
        var x2_before = await createTCTree(params['file'], findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj);
    }

    var x3_before = await createTSTree(params['file'], findElement(jsonObj, params, elpath2[0]).obj);
    if (elpath2.length > 1) {
        var x4_before = await createTCTree(params['file'], findElement(jsonObj, params, elpath2[0] + "/" + elpath2[1]).obj);
    }

    el = findElement(jsonObj, params, params['path']);
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

    el2 = findElement(jsonObj, params, params['newpath']);
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
            await createTSTree(params['file'], newObj) :
            (el.type == 'tc' ?
                await createTCTree(params['file'], newObj) :
                await createStepTree(params['file'], newObj))
        );

        jsonObj.modified = true;
        params['struct'] = JSON.stringify(tree);
        sendCallback(params['file'], "pastedrop", JSON.stringify(params));

        var x1_after = await createTSTree(params['file'], findElement(jsonObj, params, elpath[0]).obj);
        updateFolderStatus(params['file'], elpath[0], x1_before.status, x1_after.status);
        if (elpath.length > 2) {
            var x2_after = await createTCTree(params['file'], findElement(jsonObj, params, elpath[0] + "/" + elpath[1]).obj);
            updateFolderStatus(params['file'], elpath[0] + "/" + elpath[1], x2_before.status, x2_after.status);
        }

        var x3_after = await createTSTree(params['file'], findElement(jsonObj, params, elpath2[0]).obj);
        updateFolderStatus(params['file'], elpath2[0], x3_before.status, x3_after.status);
        if (elpath2.length > 1) {
            var x4_after = await createTCTree(params['file'], findElement(jsonObj, params, elpath2[0] + "/" + elpath2[1]).obj);
            updateFolderStatus(params['file'], elpath2[0] + "/" + elpath2[1], x4_before.status, x4_after.status);
        }
    }
}

async function parsePOSTGetStep(req, params, res, jsonObj) {
    for (let tsnumber in jsonObj.testsuites) {
        var ts = jsonObj.testsuites[tsnumber];
        let path = ts.name;
        for (let tcnumber in ts.children) {
            var tc = ts.children[tcnumber];
            let lines = tc.input;
            if (lines.length == 0) {
                for (let stepnumber in tc.children) {
                    var step = tc.children[stepnumber];
                    if (path + "/" + tc.name + "/" + step.name === params['path']) {
                        var stepcopy = JSON.parse(JSON.stringify(step));
                        sendPlain(req, res, "{" + await getJSON(stepcopy.dbid, params['dt'], params['file']) + "}");
                        return;
                    }
                }
            } else {
                //fixme
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
                    for (let stepnumber in tc.children) {
                        var step = tc.children[stepnumber];
                        if (path + "/" + tc.name + "/" + step.name === params['path']) {
                            var stepcopy = JSON.parse(JSON.stringify(step));
                            sendPlain(req, res, "{" + await getJSON(stepcopy.dbid, params['dt'], params['file']) + "}");
                            return;
                        }
                    }
                }
            }
        }
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

    params["path"] = jsonObj.testsuites[0].name;
    params["new"] = "new testsuite";
    params["newElementPath"] = "new testsuite";
    params["elplen"] = "1";
    params["op"] = "newelement";
    let newTS = {};
    newTS.name = "new testsuite";
    newTS.children = [];
    jsonObj.testsuites.unshift(newTS);
    jsonObj.modified = true;
    sendCallback(params['file'], "newelement", JSON.stringify(params));

    for (pathIndex in YAMLobj.paths) {
        for (methodIndex in YAMLobj.paths[pathIndex]) {
            let TC = YAMLobj.paths[pathIndex][methodIndex];

            let newTC = {};
            newTC.name = TC.operationId;
            newTC.children = [];
            newTC.input = [];
            newTS.children.push(newTC);
            params["op"] = "newelementinside";
            params["new"] = TC.operationId;
            params["path"] = "new testsuite";
            params["newElementPath"] = "new testsuite/" + TC.operationId;
            params["elplen"] = "1";
            sendCallback(params['file'], "newelementinside", JSON.stringify(params));

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
            newStep.conLen = true;
            newStep.url = YAMLobj.servers.url + pathIndex;
            newTC.children.push(newStep);
            params["new"] = TC.operationId;
            params["path"] = "new testsuite/" + TC.operationId;
            params["newElementPath"] = "new testsuite/" +
                TC.operationId + "/" + TC.operationId;
            params["elplen"] = "2";
            params["op"] = "newelementinside";
            sendCallback(params['file'], "newelementinside", JSON.stringify(params));
        }
    }
}

// return values from sub functions are ignored.
async function parsePOSTforms(req, params, res, jsonObj) {
    if (consoleLog) console.log(JSON.parse(JSON.stringify(params)));
    if (params["reportpage"]) {
        sendPlain(req, res, await getReportPage(parseInt(params['reportpage'])));
        return;
    }
    if (params["filepage"]) {
        sendPlain(req, res, await getProjectPage(parseInt(params['filepage'])));
        return;
    }
    if (params["op"] == "newfile") {
        return parsePOSTNewFile(req, params['name'], res);
    }
    loadDB(params['file']);
    if (!(params['file'] && fs.existsSync(
            path.normalize(__dirname + "/projects/" + params['file'])))) {
        sendPlain(req, res, "");
        return;
    }
    if (!jsonObj[params['file']]) {
        loadProjectFile(params['file']);
    }
    executed = true;
    if (params["op"] == "run") {
        return parsePOSTRun(req, params, res, jsonObj[params['file']]);
    } else if (params["op"] == "import") {
        return parsePOSTImport(req, params, res, jsonObj[params['file']]);
    } else if (params["op"] == "savefile") {
        parsePOSTSaveFile(params, jsonObj[params['file']]);
    } else if (params["op"] == "newelement") {
        parsePOSTNewElement(params, jsonObj[params['file']], false);
    } else if (params["op"] == "newelementinside") {
        parsePOSTNewElement(params, jsonObj[params['file']], true);
    } else if (params["op"] == "pasteelement") {
        PasteElement(params, jsonObj[params['file']], true, false);
    } else if (params["op"] == "dropelement") {
        PasteElement(params, jsonObj[params['file']], false, true);
    } else if (params["op"] == "renameelement") {
        parsePOSTRenameElement(params, jsonObj[params['file']]);
    } else if (params["op"] == "enabledisableelement") {
        parsePOSTEnableDisableElement(params, jsonObj[params['file']]);
    } else if (params["op"] == "deleteelement") {
        parsePOSTDeleteElement(params, jsonObj[params['file']]);
    } else if (params["op"] == "setdata" && params["data"]) {
        parsePOSTSetData(params, jsonObj[params['file']]);
    } else if (params["op"] == "getstep" && params["dt"]) {
        return parsePOSTGetStep(req, params, res, jsonObj[params['file']]);
    } else {
        executed = false;
    }
    if (executed) {
        sendPlain(req, res, "");
        return;
    }

    // return internal/proj_ts.txt or proj_tc.txt or proj_step.txt
    let elpath = params['path'].split("/");
    var obiekt = "";
    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var suite = jsonObj[params['file']].testsuites[tsnumber];
        let path = suite.name;
        if (elpath.length == 1 && suite.name == elpath[0]) {
            sendPlain(req, res, readFileContentSync("/internal/proj_ts.txt")
                .replace("<!--NAME-->", suite.name));
            return;
        }

        for (let tcnumber in suite.children) {
            var tc = suite.children[tcnumber];
            if (elpath.length == 2 && suite.name == elpath[0] && tc.name == elpath[1]) {
                obiekt = readFileContentSync("/internal/proj_tc.txt").replace("<!--NAME-->", tc.name);
                var xxxx = "<script>var csvData =`";
                for (var inputnumber in tc.input) {
                    xxxx += tc.input[inputnumber] + "\n";
                }
                path += "/" + tc.name;
                xxxx += "`;</script>";
                sendPlain(req, res, obiekt.replace("<!--DATA-->", xxxx));
                return;
            }
            for (let stepnumber in tc.children) {
                var step = tc.children[stepnumber];
                if (elpath.length == 3 && suite.name == elpath[0] && tc.name == elpath[1] && step.name == elpath[2]) {} else {
                    continue;
                }
                var stepcopy = JSON.parse(JSON.stringify(step));
                path += "/" + tc.name + "/" + step.name;

                obiekt = readFileContentSync("/internal/proj_step.txt").replace("<!--NAME-->",
                    stepcopy.name);
                if (stepcopy.urlprefix) obiekt = obiekt.replace("<!--URLPREFIX-->", stepcopy.urlprefix);
                obiekt = obiekt.replace("<!--URL-->", stepcopy.url);
                var xxxx = "";
                first = true;
                for (var headernumber in stepcopy.headers) {
                    if (!first) xxxx += "\n";
                    first = false;
                    xxxx += stepcopy.headers[headernumber];
                }
                obiekt = obiekt.replace("<!--HEADER-->", xxxx);
                var xxxx = "";
                first = true;
                for (var bodynumber in stepcopy.body) {
                    first = false;
                    xxxx += stepcopy.body[bodynumber];
                }
                obiekt = obiekt.replace("<!--BODY-->", xxxx)
                    .replace("<!--SSLIGNORE-->", stepcopy.ignoreWrongSSL ? "checked" : "")
                    .replace("<!--CONLENGTH-->", stepcopy.conLen ? "checked" : "")
                    .replace("<!--METHOD-->", stepcopy.method);
                var xxxx = "";
                if (stepcopy.dbid) {
                    let rows = await db_all(params['file'], "SELECT dt from requests where dbid =\"" + stepcopy.dbid + "\" order by dt desc");
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
                        await db_all(params['file'], "DELETE from requests where dbid  =\"" + stepcopy.dbid + "\" and dt in (" + del + ")");
                    }
                    obiekt = obiekt.replace("<!--WHENLAST-->", xxxx);
                }
                sendPlain(req, res, obiekt);
                return;
            }
        }
    }
    sendPlain(req, res, "");
}

const onRequestHandler = async (req, res) => {
    if (req.method === 'GET') {
        const params = url.parse(req.url, true).query;
        if (consoleLog) console.log(JSON.parse(JSON.stringify(params)));
        if (params["sse"]) { // PUSH functionality
            res.writeHead(200, {
                'Cache-Control': 'no-cache',
                'Content-Type': 'text/event-stream'
            });
            const session = crypto.randomBytes(32).toString('base64');
            x = [];
            x.file = params['file'];
            x.res = res;
            //                        console.log("registering SSE " + x);
            callback[session] = x;
            if (params['file'] != null && jsonObj[params['file']]) {
                x = {};
                x.file = params['file'];
                x.modified = jsonObj[params['file']].modified ? true : false;
                sendCallback(params['file'], "setenabledisablesave", JSON.stringify(x));
            }
            res.on('close', function() {
                delete callback[session];
            });
            return;
        }
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
        if (params['report'] &&
            (fs.existsSync(path.normalize(__dirname + "/reports/" + params['report'])) && params['report'].includes('.htm') ||
                fs.existsSync(path.normalize(__dirname + "/reports/" + params['report'])) && params['report'].includes('.txt'))) {
            sendHTML(req, res, readFileContentSync("/reports/" + params['report']));
            return;
        }

        let deletefromdb = false;
        if (params['file'] && fs.existsSync(
                path.normalize(__dirname + "/projects/" + params['file']))) {
            deletefromdb = (!jsonObj[params['file']]);

            if (!loadProjectFile(params['file'])) {
                sendHTML(req, res, readFileContentSync("/internal/proj.txt")
                    .replace("<!--NAME-->", "Error reading file"));
                return;
            }
            loadDB(params['file']);

            let tree = [];
            for (let tsnumber in jsonObj[params['file']].testsuites) {
                var ts = jsonObj[params['file']].testsuites[tsnumber];
                var x = await createTSTree(params['file'], ts);
                tree.push(x);
            }

            if (deletefromdb) {
                let alldbid = "'abc'";
                for (let tsnumber in jsonObj[params['file']].testsuites) {
                    var ts = jsonObj[params['file']].testsuites[tsnumber];
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
                dbObj[params['file']].run(`delete from requests where dbid not in (` + alldbid + `)`,
                    err => {
                        //                        console.log("error " + err)
                    });
            }
            sendHTML(req, res, readFileContentSync("/internal/proj.txt")
                .replace("<!--VERSION-->", version + " (GPLv3)")
                .replace("<!--JSLIB-->",
                    readFileContentSync("/internal/libjs.txt"))
                .replace("<!--FOLDERS_MENU-->",
                    readFileContentSync("/internal/proj_folder.txt"))
                .replace("<!--TC-->", "<script>tree = " + JSON.stringify(tree) + ";</script>")
                .replace("<!--NAME-->", params['file']));
            return;
        }
    } else if (req.headers['content-type'] == "application/x-www-form-urlencoded") { // POST
        let body = "";
        req.on('data', function(data) {
            body += data;
            if (body.length > 1e6 * 6) req.connection.destroy(); // 6 MB
        });
        req.on('end', function() {
            parsePOSTforms(req, url.parse("/?" + body, true).query, res, jsonObj);
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
    params = []
    params['file'] = process.argv[2];
    params['path'] = process.argv.length === 4 ? process.argv[3] : "";
    parsePOSTRun(null, params, null, jsonObj[process.argv[2]]);
} else if (process.argv.length === 2) {
    http2.createSecureServer({
        key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
        cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
    }, onRequestHandler).listen(port, hostname, async () => {
        console.log(`Server running at https://${hostname}:${port}/, Node.js ` + process.version);
    });
}