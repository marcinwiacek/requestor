const fs = require('fs');
const path = require('path');
const Handlebars = require("handlebars");
//const template = Handlebars.compile("Name: {{name}}");
//console.log(template({ name: "Nils" }));

const parser = require("fast-xml-parser");
var x = fs.readFileSync(path.normalize(__dirname + "/bela1.xml"), 'utf8');
x = x.charCodeAt(0) == 65279 ? x.substring(1) : x;
var jsonObj = parser.parse(x);
//console.log(jsonObj);
//console.log(jsonObj.project.step[1].type2);

function execute(arr,templates) {
  console.log("starting");
//	console.log(arr);
//console.log(arr.size());
  for (index in arr.step) {
if (arr.type===undefined) {
         s = arr.step[index];
} else {
  s = arr.step;
}
	console.log(s.type);
	if (s.type=="requestTemplate") {
	} else if (s.type=="forEach") {
	    execute(s,templates);
	} else if (s.type=="request") {
	}
if (arr.type===undefined) {
} else {
break;
}
    }
}

execute(jsonObj.project);
