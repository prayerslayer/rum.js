# rum.js 🍾

YO HO HO AND A BOTTLE OF RUM!

Seriously though, how do analytics scripts work? Do they work? Let's find out.

## Things it can do

* Support for sessions and multiple tabs (a session is be as long as there is at least one tab open — until the last closes or reloads) ✅
* Measure HTTP request timing ✅
* Measure navigation timing ✅

## Questions, open issues

* Probably it should somehow keep track of application route and have some counters?
* What about measuring unique visitors?
* More cross-browser support, ie workarounds for no `navigator.sendBeacon` and such
* Polling for finished ajax requests isn't *that* cool, this is probs better solved with an event emitter or the like
* How big is an analytics script allowed to be and how much data in many requests is it allowed to send before people stop using it?
* Script happily uses lots of global stuff that may or may not work as expected (e.g. other scripts overwriting Array prototype and such). Should it defend against that? How? Aren't all bets off anyways when that's a possibility?
* As for minimizing network access, esp. when considering mobile, it may or may not make sense to use a compressed data format (ie not JSON)
* How to measure overhead of the script?
* How to test it, even? Selenium + mock backend + some test runner opening different test sites?
