let templates = [];

function addTemplate(name, value) {
    templates[name] = value;
}

addTemplate("google", "https://www.google.com/search?q=")
addTemplate("duck", "https://duckduckgo.com/?q=")

let steps = [];

const stepName = {
    ForEach: 1,
    RequestHTTP1: 2
}

function addStep(id, name, parent, value1, value2, value3) {
    let arr = []
    arr["id"] = id
    arr["name"] = name
    arr["parent"] = parent
    arr["value1"] = value1
    arr["value2"] = value2
    arr["value3"] = value3
    steps[name] = arr
}

addStep(stepName.ForEach, "1", "", "engine,word\ngoogle,test\nduck,test", "", "");
addStep(stepName.RequestHTTP1, "2", "1", "${engine}${word}", "", "");

function executeStep(name, arr) {
    steps.forEach(function(t, index) {
        if (name == t["name"]) {
            switch (t["id"]) {
                case stepName.ForEach:
		    console.log(t["value1"]);
		    let lines = t["value1"].split("\n");
		    let headers = []
		    console.log(lines[0].split(","));
		    lines.forEach(function(l) {
			if (headers.length == 0) {
			    headers = l.split(",");
			} else {
			    let ll = l.split(",");
			    let i = 0;
				let arra = [];
				headers.forEach(function(h) {
		    console.log(h+ " "+ll[i]);
				    arra[h] = ll[i];
				    i++;
				});
		    console.log(arra);
    steps.forEach(function(tt, index) {
        if (tt["parent"] == t["id"]) {
executeStep(tt["id"],arra);
	}
    });    
			}
		    });
                    break;
                case stepName.RequestHTTP1:
                    break;
            }
        }
    });
}

executeStep("1",null);
