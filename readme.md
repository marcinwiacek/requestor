# Preamble

**Requestor** is application for sending, analizing and testing SOAP/REST/HTML/HTTP requests.
Initially created as proof of concept, currently could be used in various situations
as replacement for SoapUI, Ready API, Postman, curl and similar tools.
Written in Java Script using nodeJS (=speed, available code, no problems with onboarding
in some companies, support for all important features, etc.).

# Goals
* Creating simple app, which will provide all important technical elements for fast starting
and making testing for requests (without bla, bla, bla)
* Avoiding stupid, annoying actions in such software (user should be focused on this, what
should be done, not on tool itself)
* Providing support for modern elements like HTTP/2

# TODO
ewentualna zmiana nazw przy przenoszeniu
czasami przy drag i drop zle budowanie drzewka
edycja danych

run for the whole suite / tc
junit results
runner
own ssl cert
params between steps
zmiana parameterow w body, headers

# Why another app?
Because many existing apps were written years ago and are obsolete
and sometimes have horrible GUI.

# License

# Ha, ha, license allows for using it for free, I don't need to pay
Indeed. But remember, that time is money and there is some theorical possibility, that
your requests to the project member(s) will have lower priority (in other words: I/we do,
what we can, but will have to pay bills and do some other things too)

# Code is horrible, all should go to the trash, bla, bla, bla
Yes. Month ago it was worse, year ago worse than month ago. Normally you start from
something horrible / small and improve it. This is called progress
(Android 1.0, Windows 1.0 or even iOS 1.0 were not excellent too). If you're not patient,
write & propose something better or allow big boys to work.

# I want this and this function
Wait or see previous points. Theoretically, if we don't have technical limits in
nodeJS, it could be added.

# Known issues

* When SSL certificate on the server side has got problems (is expired, etc.), Requestor
doesn't show it - currently (Node 20.11) it's Node limit.

# Support
GitHub or marcin (@) mwiacek (.) com. I will do my best, but I can't give
any SLA with free version. Time is money.

# There is no big company staying behind this
Linux kernel started this way too. And today you have it in desktop, Android, etc.

# Why nodeJS?
In my life I have used many languages, for example:

* assembler was powerfull (but required too much effort)
* C nice (but not very welcome in business environments)
* C++ and Rust overcomplicated
* Java boring (which gave me the chance to pay bills)
* Pascal/Delphi perfect solution for creating powerfull GUI apps without big errors (but unfortunatelly dropped in market)
* PHP/Basic/Visual Basic limited and prepared for some scenarios only
* Sharp languages (C#, etc.) made wrong first impressions (I remember, how wrong they were in first versions)

JavaScript itself is not very good language (or more honestly, it's ugly language), but in combination with nodeJS allowed me for creating [very nice Sobieski+ concept](https://mwiacek.com/www/?q=node/401) with full file CMS solution with chats, Google integration, multiuser work and many other features.

I believe, that this combination has got future for next years. It doesn't mean of course, that in the future I will not use [Carbon](https://github.com/carbon-language/carbon-lang) or something else.

# Installation
1. ```sudo snap install node --classic --channel=20```
2. ```sudo npm install sqlite3```
3. ```node requestor.js```

# Used projects
1. [Split](https://github.com/nathancahill/split) (MIT)
2. [Tabulator](https://tabulator.info/docs/5.5/install) (MIT)

# Generating SSL keys (info for me in development)
```openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem```

# Formatting source (info for me in development)
1. ```npm -g install js-beautify```
2. ```npm -g install html-beautify```
3. ```js-beautify -e "\n" ng1.js > x```
4. ```html-beautify -e "\n" project.html > x```
5. ```sudo apt install retext```