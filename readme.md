Requestor

Application for sending, analizing and testing requests. Initially created as
proof of concept, currently could be used in various situations as simpler
replacement for SoapUI, Ready API, Postman, curl and similar tools.
Written in Java Script, using nodeJS (=speed, available code, no problems with
onboarding in some companies, support for all important features, etc.).

# Why another app?
Because many existing apps were written years ago and are obsolete
and sometimes have horrible GUI.

# Ha, ha, license allows for using it for free, I don't need to pay
Indeed. But don't expect all possible support in such situation. Time is money.

# I want this and this function
Wait or see previous point.

# Support
GitHub or marcin (@) mwiacek (.) com. I will do my best, but I can't give
any SLA with free version. Time is money.

# There is no big company staying behind this
Linux kernel started this way. And today you have it in desktop, Android, etc.

# Code is horrible, all should go to the trash, bla, bla, bla
Yes. Month ago it was worse, year ago much worse. Normally you start from
something horrible or small and improve it. This is called progress
(Android 1.0 or Windows 1.0 were not excellent too). If you're not patient,
write & propose something better or allow other to work.

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
1. npm -g install js-beautify
2. npm -g install html-beautify
3. ```js-beautify -e "\n" ng1.js > x```
4. ```html-beautify -e "\n" project.html > x```
