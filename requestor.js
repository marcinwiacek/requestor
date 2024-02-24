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
const crypto = require('crypto');

const hostname = '127.0.0.1';
const port = 3000;
const maxResultsPerRequest = 500;

let jsonObj = [];
let dbObj = [];
callback = [];

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
                    var resp = {}
                    resp.body = Buffer.concat(chunk).toString();
                    resp.headers = response.headers;
                    resp.code = response.statusCode;
                    resp.error = resperror;
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
                if (resperror) {
                    resperror += "\n";
                }
                if (s == 'undefined ') {
                    resperror += e.message;
                } else {
                    resperror += s;
                }
                resp.error = resperror;
                resp.certinfo = certinfo;
                resolve(resp);
            });
            if (req.method == "post") {
                r.write(req.body);
                r.end();
            }
        } catch (e) {
            var resp = {}
            resp.body = '';
            resp.headers = [];
            resp.code = 0;
            var s = e.errors + " ";
            if (resperror) {
                resperror += "\n";
            }
            if (s == 'undefined ') {
                resperror += e.message;
            } else {
                resperror += s;
            }
            resp.error = resperror;
            resp.certinfo = "";
            resolve(resp);
        }
    });
}

function getDateString(dt) {
    return dt.getFullYear() + "-" + digits(dt.getMonth() + 1, 2) + "-" +
        digits(dt.getDate(), 2) + " " + digits(dt.getHours(), 2) + ":" +
        digits(dt.getMinutes(), 2) + ":" + digits(dt.getSeconds(), 2) + " " +
        digits(dt.getMilliseconds(), 3);
}

async function request2(req, res, times, filename) {
    console.log("request " + JSON.stringify(req));
    console.log("start");
    let dt = new Date();
    let curDT = getDateString(dt);
    var response = await executeRequest(req);
    let curDT2 = getDateString(new Date());
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
    if (!req.dbid) req.dbid = getDateString(dt);
    dbObj[filename].run(`insert into requests (dt, dbid, url, headers,body,headers_res,body_res,method,ssl_ignore,code_res,cert_res,dt_res,error_res) values(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        curDT, req.dbid, req.url, headers, req.body, headers_res, response.body, req.method, req.ignoreWrongSSL, response.code, response.certinfo, curDT2, response.error,
        err => {
            console.log("error " + err)
        });
    console.log("end");
    return "{" + (await getJSON(req.dbid, curDT, filename)) + ",\"oldtimes\":" + JSON.stringify(times) + "}";
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

function findElement(jsonObj, params, deleteDBID, deleteOriginal) {
    return findElement2(jsonObj, params, params['path'], deleteDBID, deleteOriginal);
}

function findElement2(jsonObj, params, pathString, deleteDBID, deleteOriginal) {
    let elpath = pathString.split("/");
    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var suite = jsonObj[params['file']].testsuites[tsnumber];
        if (elpath.length == 1 && suite.name == elpath[0]) {
            retVal = [];
            retVal.type = 'suite';
            if (deleteDBID) {
                retVal.obj = JSON.parse(JSON.stringify(suite));
                for (let tcnumber in retVal.obj.testcases) {
                    var tc = retVal.obj.testcases[tcnumber];
                    for (let stepnumber in tc.steps) {
                        delete tc.steps[stepnumber].dbid;
                    }
                }
            } else if (deleteOriginal) {
                retVal.obj = JSON.parse(JSON.stringify(suite));
                jsonObj[params['file']].testsuites.splice(tsnumber, 1);
            } else {
                retVal.obj = suite;
            }
            retVal.index = tsnumber;
            retVal.parentarray = jsonObj[params['file']].testsuites;
            return retVal;
        }
        for (let tcnumber in suite.testcases) {
            var tc = suite.testcases[tcnumber];
            if (elpath.length == 2 && suite.name == elpath[0] && tc.name == elpath[1]) {
                retVal = [];
                retVal.type = 'tc';
                retVal.obj = tc;
                if (deleteDBID) {
                    retVal.obj = JSON.parse(JSON.stringify(tc));
                    for (let stepnumber in retVal.obj.steps) {
                        delete retVal.obj.steps[stepnumber].dbid;
                    }
                } else if (deleteOriginal) {
                    retVal.obj = JSON.parse(JSON.stringify(tc));
                    suite.testcases.splice(tcnumber, 1);
                } else {
                    retVal.obj = tc;
                }
                retVal.index = tcnumber;
                retVal.parentarray = suite.testcases;
                return retVal;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (elpath.length == 3 && suite.name == elpath[0] && tc.name == elpath[1] && step.name == elpath[2]) {
                    retVal = [];
                    retVal.type = 'step';
                    retVal.obj = step;
                    if (deleteDBID) {
                        retVal.obj = JSON.parse(JSON.stringify(step));
                        delete retVal.obj.dbid;
                    } else if (deleteOriginal) {
                        retVal.obj = JSON.parse(JSON.stringify(step));
                        tc.steps.splice(stepnumber, 1);
                    } else {
                        retVal.obj = step;
                    }
                    retVal.index = stepnumber;
                    retVal.parentarray = tc.steps;
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
    if (params["op"] == "newfile") {
        return parsePOSTNewFile(req, params, res, jsonObj);
    }
    loadDB(params['file']);
    if (params["runstep"]) {
        return parsePOSTRunStep(req, params, res, jsonObj);
    } else if (params["op"] == "run") {
        return parsePOSTRun(req, params, res, jsonObj);
    } else if (params["op"] == "savefile") {
        return parsePOSTSaveFile(req, params, res, jsonObj);
    } else if (params["op"] == "newelement") {
        return parsePOSTNewElement(req, params, res, jsonObj);
    } else if (params["op"] == "newelementinside") {
        return parsePOSTNewElementInside(req, params, res, jsonObj);
    } else if (params["op"] == "pasteelement") {
        return parsePOSTPasteElement(req, params, res, jsonObj);
    } else if (params["op"] == "dropelement") {
        return parsePOSTPasteFromDragElement(req, params, res, jsonObj);
    } else if (params["op"] == "renameelement") {
        return parsePOSTRenameElement(req, params, res, jsonObj);
    } else if (params["op"] == "enabledisableelement") {
        return parsePOSTEnableDisableElement(req, params, res, jsonObj);
    } else if (params["op"] == "deleteelement") {
        return parsePOSTDeleteElement(req, params, res, jsonObj);
    } else if (params["op"] == "setdata" && params["data"]) {
        return parsePOSTSetData(req, params, res, jsonObj);
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
        let path = suite.name;
        if (elpath.length == 1 && suite.name == elpath[0]) {
            sendPlain(req, res, readFileContentSync("/internal/proj_ts.txt").replace("<!--NAME-->", suite.name));
            return;
        }

        for (let tcnumber in suite.testcases) {
            var tc = suite.testcases[tcnumber];
            if (elpath.length == 2 && suite.name == elpath[0] && tc.name == elpath[1]) {
                obiekt = readFileContentSync("/internal/proj_tc.txt").replace("<!--NAME-->", tc.name);
                var xxxx = "<script>var csvData =`";
                for (var inputnumber in tc.input) {
                    xxxx += tc.input[inputnumber] + "\n";
                }
                path += "/" + tc.name;
                xxxx += "`;</script>";
                sendPlain(req, res, obiekt
                    .replace("<!--PATH-->", "<script>path = '" + path + "';</script>")
                    .replace("<!--DATA-->", xxxx));
                return;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
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
                if (stepcopy.dbid) {
                    let rows = await db_all(params['file'], "SELECT dt from requests where dbid =\"" + stepcopy.dbid + "\" order by dt desc");
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

async function parsePOSTRenameElement(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params, false, false);
    if (el != null) {
        console.log(el);
        el.obj.name = params['new'];
    }
    sendPlain(req, res, "");
}

async function parsePOSTNewElement(req, params, res, jsonObj2) {
    if (params['path'] == "") {
        let newTS = {};
        newTS.name = params["new"];
        newTS.testcases = [];
        jsonObj[params['file']].testsuites.unshift(newTS);
    } else {
        el = findElement(jsonObj2, params, false, false);
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
                el.parentarray.splice(el.index, 0, newStep);
            } else if (elpath.length == 2) {
                let newTC = {};
                newTC.name = params["new"];
                newTC.steps = [];
                newTC.input = [];
                el.parentarray.splice(el.index, 0, newTC);
            } else if (elpath.length == 1) {
                let newTS = {};
                newTS.name = params["new"];
                newTS.testcases = [];
                el.parentarray.splice(el.index, 0, newTS);
            }
        }
    }
    sendPlain(req, res, "");
}

async function parsePOSTNewElementInside(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params, false, false);
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
    el = findElement(jsonObj2, params, false, false);
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
    //fixme delete from db
    el = findElement(jsonObj2, params, false, false);
    if (el != null) {
        el.parentarray.splice(el.index, 1);
    }
    sendPlain(req, res, "");
}

async function parsePOSTSetData(req, params, res, jsonObj2) {
    el = findElement(jsonObj2, params, false, false);
    if (el != null) {
        el.obj.input = params['data'].split("\n");
    }
    sendPlain(req, res, "");
}

function createStepTree(obj) {
    var stepobj = {}
    stepobj.name = obj.name;
    stepobj.type = 'step';
    stepobj.disabled = obj.disabled && obj.disabled == true ? true : false;
    return stepobj;
}

function createTCTree(obj) {
    var tcobj = {}
    tcobj.name = obj.name;
    tcobj.type = 'tc';
    tcobj.disabled = obj.disabled;
    tcobj.folders = []
    tcobj.files = []

    for (let stepnumber in obj.steps) {
        var step = obj.steps[stepnumber];
        tcobj.files.push(createStepTree(step));
    }
    return tcobj;
}

function createTSTree(obj) {
    var tsobj = {}
    tsobj.name = obj.name;
    tsobj.type = 'ts';
    tsobj.disabled = obj.disabled;
    tsobj.folders = []
    tsobj.files = []

    for (let tcnumber in obj.testcases) {
        var tc = obj.testcases[tcnumber];
        tsobj.folders.push(createTCTree(tc));
    }
    return tsobj;
}

async function parsePOSTPasteElement(req, params, res, jsonObj2) {
    PasteElement(req, params, res, jsonObj2, true, false);
}

async function parsePOSTPasteFromDragElement(req, params, res, jsonObj2) {
    PasteElement(req, params, res, jsonObj2, false, true);
}

function PasteElement(req, params, res, jsonObj2, deleteDB, deleteOriginal) {
    el = findElement(jsonObj2, params, deleteDB, deleteOriginal);
    el2 = findElement2(jsonObj2, params, params['newpath'], false, false);
    tree = [];
    if (el != null && el2 != null) {
        console.log("el and el2 found");
        let newObj = JSON.parse(JSON.stringify(el.obj));

        let elpath = params['path'].split("/");
        let elpath2 = params['newpath'].split("/");

        if (elpath.length != elpath2.length) {
            if (elpath2.length == 1) {
                while (true) {
                    found = false;
                    for (let tcnumber in el2.obj.testcases) {
                        var tc = el2.obj.testcases[tcnumber];
                        if (tc.name === newObj.name) {
                            newObj.name = newObj.name + "(copy)";
                            found = true;
                        }
                    }
                    if (!found) break;
                }
                el2.obj.testcases.unshift(newObj);
            } else if (elpath2.length == 2) {
                while (true) {
                    found = false;
                    for (let stepnumber in el2.obj.steps) {
                        var step = el2.obj.steps[stepnumber];
                        if (step.name === newObj.name) {
                            newObj.name = newObj.name + "(copy)";
                            found = true;
                        }
                    }
                    if (!found) break;
                }

                el2.obj.steps.unshift(newObj);
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

        if (el.type == 'suite') {
            tree.push(createTSTree(newObj));
        } else if (el.type == 'tc') {
            tree.push(createTCTree(newObj));
        } else {
            tree.push(createStepTree(newObj));
        }
    }
    sendPlain(req, res, JSON.stringify(tree));
}

async function parsePOSTSaveFile(req, params, res, jsonObj2) {
    const lastModified = (await fs.promises.stat(path.normalize(__dirname + '/projects/' + params['file']))).mtime;

    fs.rename(
        path.normalize(__dirname + '/projects/' + params['file']),
        path.normalize(__dirname + '/projects/' + params['file'] + lastModified),
        function(err) {
            if (err) console.log('ERROR: ' + err);
        });

    fs.writeFile(path.normalize(__dirname + '/projects/' + params['file']), JSON.stringify(jsonObj[params['file']], null, 2), function(err) {
        if (err) {
            return console.log(err);
        }
    });
    sendPlain(req, res, "");
}

async function parsePOSTNewFile(req, params, res, jsonObj2) {

    fs.writeFile(path.normalize(__dirname + '/projects/' + params['name'] + ".json"),
        "{ \"format\": \"created by requestor\",\"testsuites\": []}",
        function(err) {
            if (err) {
                return console.log(err);
            }
        });

    sendPlain(req, res, "");
}

async function parsePOSTRunStep(req, params, res, jsonObj2) {
    var sss = "";
    console.log("fire run step ");
    console.log(params);
    let arr = jsonObj[params['file']];
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
                if ((ts.name + "/" + tc.name + "/" + step.name).localeCompare(params['runstep']) != 0) {
                    continue;
                }
                console.log("starting " + step.name + " vs " + params['runstep']);
                step.method = params['method'];
                step.headers = decodeURIComponent(params['headers']).split("\n");
                step.body = decodeURIComponent(params['body']);
                step.ignoreWrongSSL = params['ssl'] == "true";
                step.conLen = params['conlen'] == "true";
                step.url = decodeURIComponent(params['url']);
                let lines = tc.input;
                if (lines.length == 0) {
                    sss = await request2(step, res, times, params['file']);
                    times.push(JSON.parse(sss).datetime);
                } else {
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
                        var stepcopy = JSON.parse(JSON.stringify(step));
                        for (let d in arra) {
                            console.log(arra[d]);
                            stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                        }
                        sss = await request2(stepcopy, res, times, params['file']);
                        step.dbid = stepcopy.dbid;
                        times.push(JSON.parse(sss).datetime);
                        if (stepcopy.url.length == step.url.length) {
                            break;
                        }
                    }
                }

            }
        }
    }
    sendPlain(req, res, sss);
}

async function addToRunReport(file, p, answer) {
    console.log(answer);
    a2 = JSON.parse(answer);

s =         "Step '" + p + "'\nRequest " + a2.datetime+"\n"+
	a2.method + " " + a2.url ;
for (let str in a2.headers) {
    s+=a2.headers[str]+"\n";
}
s+="\n\n"+
(a2.error==""?"Response":"Error")+
     a2.datetime_res + "\n"+
(a2.cert_res==""?"":decodeURIComponent(a2.cert_res)+"\n")+
"HTTP code "+a2.code_res+"\n"+
"\n\n";

    fs.appendFile(path.normalize(__dirname + '/runlog.txt'),s,
        function(err) {
            if (err) {
                return console.log(err);
            }
        });
}

async function parsePOSTRun(req, params, res, jsonObj2) {
    var sss = "";
    console.log("fire run step ");
    console.log(params);
    let arr = jsonObj[params['file']];
    let times = [];
    let p = params['path'].split("/");
    console.log("p is " + p);
    fs.appendFile(path.normalize(__dirname + '/runlog.txt'),
        "Run '" + params['path'] + "'\n\n",
        function(err) {
            if (err) {
                return console.log(err);
            }
        });
    let runit = false;
    for (let tsnumber in arr.testsuites) {
        var ts = arr.testsuites[tsnumber];
        //        console.log("testsuite name " + ts.name);
        if (params['path'] == "" || ts.name.localeCompare(p[0]) == 0) {} else {
            continue;
        }
        //        if ((ts.name + "/" + tc.name + "/" + step.name).localeCompare(params['runstep']) != 0) {
        for (let tcnumber in ts.testcases) {
            var tc = ts.testcases[tcnumber];
            //            console.log("testcase name " + tc.name);

            if (params['path'] == "" || p.length == 1 || (p.length > 1 && tc.name.localeCompare(p[1]) == 0)) {} else {
                continue;
            }
            for (let stepnumber in tc.steps) {
                var step = tc.steps[stepnumber];
                if (tc.disabled && tc.disabled == true) {
                    continue;
                }
                //                console.log(step.name + " vs " + params['runstep']);
                if (params['path'] == "" || p.length < 3 || (p.length == 3 && tc.name.localeCompare(p[1]) == 0)) {} else {
                    continue;
                }
                console.log("starting " + step.name + " vs " + params['path']);
                /*                step.method = params['method'];
                                step.headers = decodeURIComponent(params['headers']).split("\n");
                                step.body = decodeURIComponent(params['body']);
                                step.ignoreWrongSSL = params['ssl'] == "true";
                                step.conLen = params['conlen'] == "true";
                                step.url = decodeURIComponent(params['url']);*/
                let lines = tc.input;
                if (lines.length == 0) {
                    sss = await request2(step, res, times, params['file']);
                    times.push(JSON.parse(sss).datetime);
                } else {
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
                        var stepcopy = JSON.parse(JSON.stringify(step));
                        for (let d in arra) {
                            console.log(arra[d]);
                            stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                        }
                        sss = await request2(stepcopy, res, times, params['file']);

for (let i in callback) {
    if (callback[i].file == params['file']) {
        callback[i].res.write("event: r\n");
        callback[i].res.write("data: "+
        "Executing "+ts.name + "/" + tc.name + "/" + step.name+"\n\n");
    }
}

                        addToRunReport("", ts.name + "/" + tc.name + "/" + step.name, sss);
                        step.dbid = stepcopy.dbid;
                        times.push(JSON.parse(sss).datetime);
                        if (stepcopy.url.length == step.url.length) {
                            break;
                        }
                    }
                }

            }
        }
    }
for (let i in callback) {
    if (callback[i].file == params['file']) {
        callback[i].res.write("event: r\n");
        callback[i].res.write("data: \n\n");
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

async function getJSON(dbid, dt, file) {
    let rows = await db_all(file, "SELECT * from requests where dbid =\"" + dbid + "\" and dt=\"" + decodeURIComponent(dt) + "\"");
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
                    if ((path + "/" + tc.name + "/" + step.name).localeCompare(params['path']) != 0) {
                        continue;
                    }
                    if (!path.includes("/")) path += "/" + tc.name + "/" + step.name;
                    var stepcopy = JSON.parse(JSON.stringify(step));
                    //                    if (stepcopy.urlprefix) stepcopy.url = stepcopy.urlprefix + stepcopy.url;
                    for (let d in arra) {
                        console.log(d);
                        console.log(arra[d]);
                        stepcopy.url = stepcopy.url.replace("{{" + d + "}}", arra[d]);
                    }
                    for (const match of stepcopy.url.matchAll(/{{(.*)#(.*)}}/g)) {
                        console.log(match)
                    }
                    sendPlain(req, res, "{" + await getJSON(stepcopy.dbid, params['dt'], params['file']) + "}");
                }
            }
        }
    }
}

function parseGETWithSseParam(req, res, userName, token) {
    //check field format
    //            console.log(req.headers);
    //fixme - we need checking URL beginning
    let id = req.headers['referer'].match(/.*chat\/pokaz\/([0-9]+)$/);
    if (id && fs.existsSync(__dirname + "//chat//" + id[1] + ".txt")) {
        return addToCallback(req, res, id[1], callbackChat, userName, false, token);
    }
    id = req.headers['referer'].match(/.*([a-ząż]+)\/pokaz\/([0-9]+)(\/ver{1,1}[0-9]*)?$/);
    if (id && fs.existsSync(__dirname + "//texts//" + id[2] + ".txt")) {
        return addToCallback(req, res, id[2], callbackText, userName, false, token);
    }
    const params = url.parse(req.headers['referer'], true).query;
    addToCallback(req, res, params["q"] ? params["q"] : "", callbackOther, userName, true, token);
}

const onRequestHandler = async (req, res) => {
    if (req.method === 'GET') {
        const params = url.parse(req.url, true).query;
        console.log(params);

        if (params["sse"]) { // PUSH functionality
            res.writeHead(200, {
                'Cache-Control': 'no-cache',
                'Content-Type': 'text/event-stream',
                'Connection': 'keep-alive'
            });
            const session = crypto.randomBytes(32).toString('base64');
x = [];
x.file = params['file'];
x.res = res;
            callback[session] = x;
            /*    if (!callback[id]) callback[id] = [];
                // order consistent with CallbackField
                callback[id][session] = [res];
            */
            res.on('close', function() {
                console.log('closing callback ' + callback[session]);
                //        for (let index in sessions) {
                /*            sessionEntry = sessions[index];
                            if (sessionEntry[SessionField.Expiry] < Date.now()) {
                                if (sessionEntry[SessionField.RefreshCallback] != null) clearTimeout(sessionEntry[SessionField.RefreshCallback]);
                                sessions.splice(index, 1);
                                continue;
                            }
                            if (sessionEntry[SessionField.SessionToken] == callback[id][session][CallbackField.SessionToken]) {
                                if (sessionEntry[SessionField.RefreshCallback] != null) clearTimeout(sessionEntry[SessionField.RefreshCallback]);
                                break;
                            }*/
                //        }
                delete callback[session];
            });
            return;
            //            parseGETWithSseParam(req, res, userName, cookieSessionToken);
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
        let deletefromdb = false;
        if (params['file'] && fs.existsSync(
                path.normalize(__dirname + "/projects/" + params['file']))) {
            deletefromdb = (!jsonObj[params['file']]);

            if (!loadFile(params['file'])) {
                sendHTML(req, res, readFileContentSync("/internal/proj.txt")
                    .replace("<!--NAME-->", "Error reading file"));
                return;
            }
            loadDB(params['file']);

            let tree = [];
            for (let tsnumber in jsonObj[params['file']].testsuites) {
                var ts = jsonObj[params['file']].testsuites[tsnumber];
                tree.push(createTSTree(ts));
            }
            console.log(JSON.stringify(tree));

            if (deletefromdb) {
                let alldbid = "'abc'";
                for (let tsnumber in jsonObj[params['file']].testsuites) {
                    var ts = jsonObj[params['file']].testsuites[tsnumber];
                    for (let tcnumber in ts.testcases) {
                        var tc = ts.testcases[tcnumber];
                        for (let stepnumber in tc.steps) {
                            var step = tc.steps[stepnumber];
                            if (step.dbid) {
                                alldbid += ",'" + step.dbid + "'";
                            }
                        }
                    }
                }
                console.log(`delete from requests where dbid not in (` + alldbid + `)`);

                dbObj[params['file']].run(`delete from requests where dbid not in (` + alldbid + `)`,
                    err => {
                        console.log("error " + err)
                    });
            }
            sendHTML(req, res, readFileContentSync("/internal/proj.txt")
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
            console.log(body);
            parsePOSTforms(req, url.parse("/?" + body, true).query, res, jsonObj);
        });
        return;
    }

    let files = "";
    let all_files = fs.readdirSync(path.normalize(__dirname + "/projects/"));
    for (filenumber in all_files) {
        if (!all_files[filenumber].endsWith('.json')) continue;
        files += "<a href=?file=" + all_files[filenumber] + ">" + all_files[filenumber] + "</a><br>";
    }

    sendHTML(req, res, readFileContentSync("/internal/index.txt").replace("<!--FILES-->", files).replace("<!--JSLIB-->",
        readFileContentSync("/internal/libjs.txt")));
};

http2.createSecureServer({
    key: fs.readFileSync(__dirname + '//internal//localhost-privkey.pem'),
    cert: fs.readFileSync(__dirname + '//internal//localhost-cert.pem')
}, onRequestHandler).listen(port, hostname, async () => {
    console.log(`Server running at https://${hostname}:${port}/, Node.js ` + process.version);
});