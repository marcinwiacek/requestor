# Preamble

**Requestor** is application for sending, analizing and testing SOAP/REST/HTML/HTTP requests.
Initially created as proof of concept, currently could be used as replacement for SoapUI,
Ready API, Postman, JMeter, curl and other similar tools.

# Goals
* creating simple & powerfull app, which will provide all important technical elements
* for fast starting and making testing for requests (without bla, bla, bla)
* avoiding stupid, annoying elements visible in similar software
(user should be focused on this, what could be/should be done, not on tool)
* providing support for modern elements like HTTP/2

# TODO
add column przy edycji danych

runner
run for the whole suite / tc
junit results

own ssl cert
params between steps
zmiana parameterow w body, headers

# Why another app?
Because many existing apps were written years ago, are obsolete and sometimes have horrible GUI.

# License

# Ha, ha, license allows for using it for free, I don't need to pay
Indeed. But remember, that time is money and there is some theorical possibility, that
your requests to the project member(s) will have lower priority (in other words: I/we do,
what we can, but will have to pay bills and do some other things too)

# Code is horrible, all should go to the trash, bla, bla, bla
Yes. It's. Month ago it was worse, year ago worse than month ago and tomorrow
will be / can be better.

Do you feel better with these knowledge?

I strongly believe, that normally you start from something horrible / small
& improve it as long as required (Android 1.0, Windows 1.0 or even iOS 1.0 
were not excellent, but without them we would not see current versions).
During this process you get experience, users and maybe also time and sponsors.
It accelerates things till we moment, when we see snowball effect.
If you're not patient, write & propose something better or shut up and allow big boys to work.

# I want this and this function
Wait or see previous points. Theoretically, if we don't have technical limits in
nodeJS, it could be added.

# Known issues
* When SSL certificate on the server side has got problems (is expired, etc.), Requestor
doesn't show it - currently (Node 20.11) it's Node limit.

# Support
* GitHub and/or 
* marcin ( at ) mwiacek (.) com + marcin.wiacek.work ( at ) gmail (.) com
(the best send your message to both).

I will do my best, but I can't give any SLA with free version. Time is money.

# There is no big company staying behind this
1. Linux kernel started in the same way. And today you have it in desktop, Android, etc.
2. Author is testing for many years and has got practical experience
(+ want to work smart, not hard) = **Requestor** doesn't need big money to
have the most important things and working state

# Why nodeJS?
In my life I have used many languages, for example:

* assembler was powerfull (but required too much effort)
* C nice (but not very welcome in business environments)
* C++ and Rust overcomplicated
* Java boring (which gave me the chance to pay bills)
* Pascal/Delphi perfect solution for creating powerfull GUI apps without big errors (but unfortunatelly dropped in market)
* PHP/Basic/Visual Basic limited and prepared for some scenarios only
* Sharp languages (C#, etc.) made wrong first impressions (I remember, how wrong they were in first versions)

JavaScript itself is not very good language (more honestly, it's ugly language), but in combination
with nodeJS allowed me for creating [very nice Sobieski+ concept](https://mwiacek.com/www/?q=node/401)
with full file CMS solution with chats, Google integration, multiuser work and many other features.
I see speed, source code availability, no problems with onboarding in some companies,
support for all important features, etc (I believe, that this combination has got future for next years).

It doesn't mean of course, that in the future I will not use [Carbon](https://github.com/carbon-language/carbon-lang)
or something else.

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
3. ```js-beautify -e "\n" requestor.js > x```
4. ```html-beautify -e "\n" project.html > x```
5. ```sudo apt install retext```
