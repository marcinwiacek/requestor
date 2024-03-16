# Preamble

**Requestor** is application for sending, analizing and testing SOAP/REST/HTML/HTTP requests.
Initially created as proof of concept, currently could be used as replacement for SoapUI,
Ready API, Postman, JMeter, curl and other similar tools.

# Goals
* Creating simple & powerfull app, which will provide all important technical elements
* Fast, easy and effective testing for requests (without bla, bla, bla)
* Avoiding stupid, annoying elements visible in similar software
(user should be focused on task, which could be/should be done, not on the tool)
* Providing support for modern elements like HTTP/2

# Features
* Sending requests (although this will mix different things, it's worth to mention,
that this can be POST, GET, XML, JSON, REST, SOAP and others)
* Preparing requests tests using GUI in web browser (tested mainly in desktop Firefox, should be
perfectly fine in Chrome/Edge/Chromium and Safari)
* Saving data in good formatted text JSON files (changes are easy to track in Git)
* Saving execution info in the SQLite DB and easy to read HTML and TXT files
* Concurrent work (when one user is doing something, other see updates)

# Installation and running
You need NodeJS with SQLite3, for example in Ubuntu it's enough to execute just two commands for installing
and one for start:

1. ```sudo snap install node --classic --channel=20```
2. ```sudo npm install sqlite3```
3. ```node requestor.js```

Command line runner:

```node requestor.js file [path]```

for example:

```node requestor.js file /TS1```

# Version history

16 March 2024 - Milestone 1

# Why another app?
Because many existing apps were written years ago and sometimes have horrible GUI or solutions.

# License
GPLv3. For other please contact author of this repo.

# Ha, ha, license allows for using it for free, I don't need to pay
Indeed. But remember, that time is money and there is some (theoretical of course) possibility, that
your requests to the project member(s) will have lower priority without paying for support
(in other words: I/we do, what we can, but will have to pay bills and various things depends on it)

# Code is horrible, all should go to the trash, bla, bla, bla
Yes. It's. Month ago it was worse, year ago even worse than month ago and tomorrow will be better.

Do you feel better with these statement and knowledge?

First of all we're using language and layout descriptions, which are not the best on the world
(see one of sections below). Additionally I strongly believe, that normally you start from something
horrible/small & improve it as long as required (Android 1.0, Windows 1.0 or even iOS 1.0
were NOT excellent, but without them we would not see current versions).
During this process you get experience, users and maybe also time and sponsors. 
It accelerates doing things + in some moment you can see snowball effect.

If you're not patient, write & propose something better or shut up and allow big boys to work.

# It is not secure
It is so much secure as it was possible.

# I want this and this function
Wait or see previous points. Theoretically, if we don't have technical limits in
nodeJS, it could be added.

# Known issues
* When SSL certificate on the server side has got problems (is expired, etc.), **Requestor**
doesn't show it - currently (Node 20.11) it's Node limit.

# TODO
Work in progress, some points:

* params between steps
* running shell scripts before request
* asserts
* junit results
* support for own ssl certificates
* support for YAML or other formats describing service formats
* redirect http to https in GUI (currently, when you use http URL, it doesn't open anything)
* unique DB ID

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
* C nice (but not very welcome in business environments because of memory leaks
and problems especially with code created by junior developers; not receommended also
by US government?)
* C++ and Rust overcomplicated
* Java boring (which gave me some chance to pay my bills)
* Pascal/Delphi perfect solution for creating powerfull GUI apps without
big errors (but unfortunatelly dropped by market)
* PHP/Basic/Visual Basic limited and prepared for some scenarios only
* Sharp languages (C#, etc.) made first impressions wrong (I remember, how slow
they were in first versions)

HTML is not always good for creating complicated layouts + JavaScript itself is not very
good language (more honestly, it's ugly language, and see for example
[Programming’s Greatest Mistakes from Mark Rendle](https://www.youtube.com/watch?v=qC_ioJQpv4E) or
[The Post JavaScript Apocalypse from Douglas Crockford](https://www.youtube.com/watch?v=99Zacm7SsWQ) or even
[The top 5 JavaScript issues in all our codebases from Phil Nash](https://www.youtube.com/watch?v=IGl-P4SHo2E) or examples from
[The Worst Programming Language Ever from Mark Rendle](https://www.youtube.com/watch?v=vcFBwt1nu2U)
or some other materials), but in combination with nodeJS allowed me for creating
[very nice technically successfull Sobieski+ concept](https://mwiacek.com/www/?q=node/401)
with full CMS file-based with chats, Google integration, multiuser work and other features.

I see speed, source code availability, lack of problems with onboarding in some companies,
support for all important features, etc. (and I believe, that this combination has got future for next years).
It doesn't mean of course, that in the future I will not use [Carbon](https://github.com/carbon-language/carbon-lang)
or something else.

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
