Requestor

Application for sending requests. Designed as replacement for SoapUI, Ready API,
Postman and many other tools. Written using nodeJS (=speed, no problems with
onboarding in many companies, support for all important features, etc.).
Allows for concurrent work.

# Why another app?
Because many existing were written years ago and are very obsolete and horrible.
I say it with > 15 years of experience.

# Ha, ha, license allows for using it for free, I don't need to pay
Indeed. But don't expect all possible support. Time is money.

# I want this and this
Wait or see previous point

# There is no big company staying behind this
Linux kernel also started this way. And today you have it in desktop, Android, etc.

# Code is horrible, all should go to the trash, bla, bla, bla
Write or propose better

# Installation
1. install nodejs - ```sudo snap install node --classic --channel=20```
2. install sqlite - ```sudo npm install sqlite3```
3. run it - ```node requestor.js```

# Used projects
1. https://github.com/nathancahill/split (MIT)
2. https://tabulator.info/docs/5.5/install (MIT)

# Generating SSL keys (info for me in development)
```
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
-keyout localhost-privkey.pem -out localhost-cert.pem
```

# Formatting source (info for me in development)
1. ```npm install --global prettier```
2. ```js-beautify -e "\n" ng1.js > x```
