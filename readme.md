Requestor

Application for sending request. Designed as replacement for SoapUI, Ready API,
Postman and many other tools. Written using nodeJS allows for concurrent work.

# Installation
1. install nodejs - ```sudo snap install node --classic --channel=20```
2. install sqlite - ```sudo npm install sqlite3```
3. run it - ```node requestor.js```

# Generating SSL keys

```
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
-keyout localhost-privkey.pem -out localhost-cert.pem
```

# Formatting source
1. ```npm install --global prettier```
2. ```js-beautify -e "\n" ng1.js > x```

# Used projects
1. https://github.com/nathancahill/split (MIT)
2. https://tabulator.info/docs/5.5/install (MIT)