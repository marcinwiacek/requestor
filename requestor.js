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
const maxResultsPerRequest = 5;

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
    options.method = req.method;
    options.timeout = 3000;
    return new Promise((resolve, reject) => {
        const r = method2(req.url, options, (response) => {
            const chunk = []
            var cipher = r.socket.getCipher();
            certinfo += "Cipher\n  " + cipher.standardName + ", " + cipher.version + "\n\n";
            var cert = r.socket.getPeerCertificate(true);
            if (cert != undefined && cert.subject) {
                while (true) {
                    certinfo += "Certificate\n";
                    certinfo += '  subject CN ' + cert.subject.CN + ', O ' + cert.subject.O + "\n";
                    certinfo += '  issuer CN ' + cert.issuer.CN + ', O ' + cert.issuer.O + "\n";
                    //      console.log('  Subject alt name '+ cert.subjectaltname)+"\n";
                    certinfo += '  Valid ' + cert.valid_from + " - " + cert.valid_to + "\n";
                    certinfo += '  SHA256 ' + cert.fingerprint256 + "\n\n";
                    lastprint256 = cert.fingerprint256;
                    cert = cert.issuerCertificate;
                    if (cert == undefined || lastprint256 == cert.fingerprint256) break;
                }
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

function digits(a, b) {
    let x = a.toString();
    while (x.length < b) {
        x = "0" + x;
    }
    return x;
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

function sendHTMLHead(res) {
    res.statusCode = 200;
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
let dbObj = [];

function directToOKFileNotFoundNoRet(res, txt, ok) {
    res.statusCode = ok ? 200 : 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end(txt);
}

// return values from sub functions are ignored.
async function parsePOSTforms(params, res, jsonObj) {
    console.log(params);
    loadFile(params['file']);
    loadDB(params['file']);
    if (params["runstep"]) {
        return parsePOSTRunStep(params, res, jsonObj);
    } else if (params["op"] == "savefile") {
        return parsePOSTSaveFile(params, res, jsonObj);
    } else if (params["op"] == "newstep") {
        return parsePOSTNewStep(params, res, jsonObj);
    } else if (params["op"] == "clonestep") {
        return parsePOSTCloneStep(params, res, jsonObj);
    } else if (params["op"] == "renamestep") {
        return parsePOSTRenameStep(params, res, jsonObj);
    } else if (params["op"] == "enabledisablestep") {
        return parsePOSTEnableDisableStep(params, res, jsonObj);
    } else if (params["op"] == "deletestep") {
        return parsePOSTDeleteStep(params, res, jsonObj);
    } else if (params["getstep"] && params["dt"]) {
        return parsePOSTGetStep(params, res, jsonObj);
    } else if (!(params['file'] && fs.existsSync(
            path.normalize(__dirname + "/projects/" + params['file'])))) {
        return;
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
                for (var bodynumber in func.body) {
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
                for (var bodynumber in stepcopy.body) {
                    xxxx += stepcopy.body[bodynumber];
                }
                obiekt = obiekt.replace("<!--BODY-->", xxxx);
                obiekt = obiekt.replace("<!--SSLIGNORE-->", stepcopy.ignoreWrongSSL ? "checked" : "");
                obiekt = obiekt.replace("<!--CONLENGTH-->", stepcopy.conLen ? "checked" : "");
                obiekt = obiekt.replace("<!--METHOD-->", stepcopy.method);
                var xxxx = "";
                let rows = await db_all(params['file'], "SELECT dt from requests where name =\"" + step.name + "\" order by dt desc");
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
                    await db_all(params['file'], "DELETE from requests where name =\"" + step.name + "\" and dt in (" + del + ")");
                }
                if (res != null) res.end(obiekt.replace("<!--WHENLAST-->", xxxx));
                return;
            }
        }
    }
    if (res != null) res.end("");
}

async function parsePOSTRenameStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
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
                console.log(step.name + " vs " + params['old']);
                if (step.name.localeCompare(params['old']) != 0) {
                    continue;
                }
                step.name = params['new'];
                break;
            }
        }
    }
    if (res != null) res.end(sss);
}

async function parsePOSTNewStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
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
                console.log(step.name + " vs " + params['old']);
                if (step.name.localeCompare(params['old']) != 0) {
                    continue;
                }
                let newStep = {};
                newStep.name = params["new"];
                newStep.method = "POST";
                newStep.headers = "";
                newStep.body = "";
                newStep.ignoreWrongSSL = true;
                newStep.conLen = true;
                newStep.url = "";
                newStep.headers = "";
                tc.steps.splice(stepnumber, 0, newStep);
                break;
            }
        }
    }
    if (res != null) res.end(sss);
}

async function parsePOSTCloneStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
    let arr = jsonObj[params['file']];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    let times = [];

    let oldStep = null;

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
                console.log(step.name + " vs " + params['new']);
                if (step.name.localeCompare(params['new']) != 0) {
                    continue;
                }
                oldStep = JSON.parse(JSON.stringify(step));
                break;
            }
        }
    }

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
                console.log(step.name + " vs " + params['old']);
                if (step.name.localeCompare(params['old']) != 0) {
                    continue;
                }
                oldStep.name = oldStep.name + "(copy)";
                tc.steps.splice(stepnumber, 0, oldStep);
                break;
            }
        }
    }

    if (res != null) res.end(sss);
}

async function parsePOSTEnableDisableStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
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
                console.log(step.name + " vs " + params['old']);
                if (step.name.localeCompare(params['old']) != 0) {
                    continue;
                }
                if (step.disabled == true) {
                    delete step.disabled;
                } else {
                    step.disabled = true;
                }
                break;
            }
        }
    }
    if (res != null) res.end(sss);
}

async function parsePOSTSaveFile(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
    let arr = jsonObj[params['file']];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    fs.writeFile(path.normalize(__dirname + '/projects/ala'), JSON.stringify(arr), function(err) {

        if (err) {
            return console.log(err);
        }
    });

    if (res != null) res.end(sss);
}

async function parsePOSTDeleteStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
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
                console.log(step.name + " vs " + params['old']);
                if (step.name.localeCompare(params['old']) != 0) {
                    continue;
                }
                tc.steps.splice(stepnumber);
                break;
            }
        }
    }
    if (res != null) res.end(sss);
}

async function parsePOSTRunStep(params, res, jsonObj2) {
    var sss = "";

    console.log(params);
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
                    sss = await request2(stepcopy, res, step.name, times, params['file']);
                    times.push(JSON.parse(sss).datetime);

                    if (stepcopy.url == step.url) break;
                }

            }
        }
    }
    if (res != null) res.end(sss);
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

async function getJSON(stepname, dt, file) {
    let rows = await db_all(file, "SELECT * from requests where name =\"" + stepname + "\" and dt=\"" + decodeURIComponent(dt) + "\"");
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

async function parsePOSTGetStep(params, res, jsonObj2) {
    console.log(jsonObj);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    for (let tsnumber in jsonObj[params['file']].testsuites) {
        var ts = jsonObj[params['file']].testsuites[tsnumber];
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
                    if (step.disabled && step.disabled == true) {
                        continue;
                    }
                    if (step.name.localeCompare(params['getstep']) != 0) {
                        continue;
                    }
                    console.log("starting " + step.name + " vs " + params['getstep']);
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
                    if (res != null) res.end("{" + await getJSON(step.name, params['dt'], params['file']) + "}");
                }
            }
        }
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
                    .replace("<!--TC-->", "")
                    .replace("<!--NAME-->", "Error reading file"));
                return;
            }
            loadDB(params['file']);

            var list = "<ul>";
            /*            for (let servicenumber in jsonObj[params['file']].services) {
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
                        }*/
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
                            "<a id=\"" + step.name + "\" class=\"step " + (step.disabled ? "disabled" : "") +
                            "\" onclick=loadRightPart(\"file=" + params['file'] + "&step=" +
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