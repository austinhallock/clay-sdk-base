!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Clay=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(e){var n,r,t,o,i,u,c,a,s,l,p,w,d;r=require("promiz"),o=(e.env.TRUSTED_DOMAIN||"clay.io").replace(/\./g,"\\."),n=window.self!==window.top,l={},c=!1,i=null,w=null,u=!1,p=function(){var e;return e=1,function(n){var t,o;t=new r;try{n.id=e,n.clientId=i,n.accessToken=null!=w?w.accessToken:void 0,l[n.id]=t,e+=1,window.parent.postMessage(JSON.stringify(n),"*")}catch(u){o=u,t.reject(o)}return t}}(),s=function(e){var n;if(!u&&!a(e.origin))throw new Error("Invalid origin "+e.origin);return n=JSON.parse(e.data),l[n.id].resolve(n.result)},d=function(){return p({method:"ping"})},a=function(e){var n;return n=new RegExp("^https?://(\\w+\\.)?(\\w+\\.)?"+o+"/?$"),n.test(e)},t=function(){function e(){this.version="v0.0.2",window.addEventListener("message",s)}return e.prototype._setInitialized=function(e){return c=e},e.prototype._setDebug=function(e){return u=e},e.prototype._setFramed=function(e){return n=e},e.prototype.init=function(e){return i=null!=e?e.clientId:void 0,u=Boolean(null!=e?e.debug:void 0),i?n?d().then(function(){return p({method:"auth.getStatus"})}).then(function(e){return c=!0,w=e}):(new r).reject(new Error("Unframed Not Implemented")):(new r).reject(new Error("Missing clientId"))},e.prototype.login=function(e){var n;return n=e.scope,(new r).reject(new Error("Not Implemented"))},e.prototype.api=function(){return(new r).reject(new Error("Not Implemented"))},e.prototype.client=function(e){return c?n?d().then(function(){return p(e)}):(new r).reject(new Error("Missing parent frame. Make sure you are within a clay game running frame")):(new r).reject(new Error("Must call Clay.init() first"))},e}(),module.exports=new t}).call(this,require("_process"));
},{"_process":3,"promiz":2}],2:[function(require,module,exports){
!function(){function t(n,e){function o(t,n,e,o){if("object"==typeof i&&"function"==typeof t)try{var c=0;t.call(i,function(t){c++||(i=t,n())},function(t){c++||(i=t,e())})}catch(r){i=r,e()}else o()}function c(){var t;try{t=i&&i.then}catch(f){return i=f,u=2,c()}o(t,function(){u=1,c()},function(){u=2,c()},function(){try{1==u&&"function"==typeof n?i=n(i):2==u&&"function"==typeof e&&(i=e(i),u=1)}catch(c){return i=c,s()}i==r?(i=TypeError(),s()):o(t,function(){s(3)},s,function(){s(1==u&&3)})})}var r=this,u=0,i=0,f=[];r.promise=r,r.resolve=function(t){return u||(i=t,u=1,setTimeout(c)),this},r.reject=function(t){return u||(i=t,u=2,setTimeout(c)),this},r.then=function(n,e){var o=new t(n,e);return 3==u?o.resolve(i):4==u?o.reject(i):f.push(o),o};var s=function(t){u=t||4,f.map(function(t){3==u&&t.resolve(i)||t.reject(i)})}}"undefined"!=typeof module?module.exports=t:this.Promiz=t}();
},{}],3:[function(require,module,exports){
function noop(){}var process=module.exports={};process.nextTick=function(){var o="undefined"!=typeof window&&window.setImmediate,e="undefined"!=typeof window&&window.postMessage&&window.addEventListener;if(o)return function(o){return window.setImmediate(o)};if(e){var s=[];return window.addEventListener("message",function(o){var e=o.source;if((e===window||null===e)&&"process-tick"===o.data&&(o.stopPropagation(),s.length>0)){var n=s.shift();n()}},!0),function(o){s.push(o),window.postMessage("process-tick","*")}}return function(o){setTimeout(o,0)}}(),process.title="browser",process.browser=!0,process.env={},process.argv=[],process.on=noop,process.addListener=noop,process.once=noop,process.off=noop,process.removeListener=noop,process.removeAllListeners=noop,process.emit=noop,process.binding=function(){throw new Error("process.binding is not supported")},process.cwd=function(){return"/"},process.chdir=function(){throw new Error("process.chdir is not supported")};
},{}]},{},[1])(1)
});