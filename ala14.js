//https://www.npmjs.com/package/fast-xml-parser
const parser = require('fast-xml-parser');
const https = require('https');

let templates = [];

let steps = [];

const stepName = {
    ForEach: 1,
    ForEachParallel: 2,
    RequestHTTP1: 3,
    Template: 4
}

function addStep(id, name, parent, value1, value2, value3, value4) {
    let arr = []
    arr["id"] = id
    arr["name"] = name
    arr["parent"] = parent
    arr["value1"] = value1
    arr["value2"] = value2
    arr["value3"] = value3
    arr["value4"] = value4
    steps[name] = arr
}

addStep(stepName.Template, "0", "", "google", "https://www.google.com/search?q=", "", "");
addStep(stepName.Template, "1", "", "duck", "https://duckduckgo.com/?q=", "", "");
addStep(stepName.ForEach, "3", "", "engine,word\n${google},test\n${duck},test", "", "", "");
addStep(stepName.RequestHTTP1, "4", "3", "GET", "${engine}${word}", "Content-Type:charset=UTF-8", "");

function rep(str, arr) {
    let reg = /\${(.+?)}/;
    let m = str;
    while (true) {
        let m0 = reg.exec(m);
        if (m0 == null) break;
        console.log("replacing " + m0[1]);
        if (arr[m0[1]]) {
            m = m.replace(m0[0], arr[m0[1]]);
        } else if (templates[m0[1]]) {
            m = m.replace(m0[0], templates[m0[1]]);
        } else {
            console.log("cannot find template " + m0[1]);
            break;
        }
        console.log("after replacing " + m);
    }
    return m;
}

function request(url, headers, met) {
    const options = {
        //method:met,
        headers
    };
    console.log(options);
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let chunks_of_data = [];

            response.on('data', (fragments) => {
                chunks_of_data.push(fragments);
            });

            response.on('end', () => {
                console.log(response.headers);
                let response_body = Buffer.concat(chunks_of_data);
                console.log(response_body.toString());
                resolve(response_body.toString());
            });

            response.on('error', (error) => {
                console.log(error);
                reject(error);
            });
        });
    });
}

async function req2(url, head, method) {
    try {
        console.log("start");
        var response_body = await request(url, head, method);
        console.log("end");
    } catch (e) {
        console.error(e);
    }

}

async function executeStep(name, parentname, arr, parallel) {
    console.log("execute step " + name);
    let lines = "";
    let headers = [];
    for (let index in steps) {
        let t = steps[index];
        if (name != t["name"] &&
            parentname != t["parent"]) {
            continue;
        }
        switch (t["id"]) {
            case stepName.Template:
                console.log(t["value1"]);
                console.log(t["value2"]);
                templates[t["value1"]] = t["value2"];
                break;
            case stepName.ForEach:
            case stepName.ForEachParallel:
                console.log(t["value1"]);
                lines = t["value1"].split("\n");
                headers = []
                console.log(lines[0].split(","));
                for (let index2 in lines) {
                    let l = lines[index2];
                    if (headers.length == 0) {
                        headers = l.split(",");
                    } else {
                        let ll = l.split(",");
                        let i = 0;
                        let arra = [];
                        headers.forEach(function(h) {
                            console.log(h + " " + ll[i]);
                            arra[h] = ll[i];
                            i++;
                        });
                        console.log(arra);

                        if (t["id"] == stepName.ForEach) {
                            await executeStep("-", t["name"], arra, false);
                        } else {
                            executeStep("-", t["name"], arra, true);
                        }
                    }
                };
                break;
            case stepName.RequestHTTP1:
                console.log("request");
                console.log(rep(t["value2"], arr));
                console.log(rep(t["value3"], arr));
                console.log(rep(t["value4"], arr));
                headers = []
                lines = t["value3"].split("\n");
                for (let index2 in lines) {
                    let ll = lines[index2].split(":");
                    if (ll.length == 2) {
                        headers[ll[0]] = ll[1];
                    }
                }
                if (parallel) {
                    req2(rep(t["value2"], arr), headers, t["value1"]);
                } else {
                    await req2(rep(t["value2"], arr), headers, t["value1"]);
                }
                break;
        }
    }
}

executeStep("0", "-", null, false);
executeStep("1", "-", null, false);
executeStep("3", "-", null, false);
