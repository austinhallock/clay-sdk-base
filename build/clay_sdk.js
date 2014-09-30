(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
var IS_FRAMED, Promiz, SDK, TRUSTED_DOMAIN, debug, gameId, isInitialized, isValidOrigin, onMessage, pendingMessages, postMessage, status, validateParent;

Promiz = require('promiz');

TRUSTED_DOMAIN = (process.env.TRUSTED_DOMAIN || 'clay.io').replace(/\./g, '\\.');

IS_FRAMED = window.self !== window.top;

pendingMessages = {};

isInitialized = false;

gameId = null;

status = null;

debug = false;

postMessage = (function() {
  var messageId;
  messageId = 1;
  return function(message) {
    var deferred, err;
    deferred = new Promiz();
    try {
      message.id = messageId;
      message.gameId = gameId;
      message.accessToken = status != null ? status.accessToken : void 0;
      pendingMessages[message.id] = deferred;
      messageId += 1;
      window.parent.postMessage(JSON.stringify(message), '*');
    } catch (_error) {
      err = _error;
      deferred.reject(err);
    }
    return deferred;
  };
})();

onMessage = function(e) {
  var message;
  if (!debug && !isValidOrigin(e.origin)) {
    throw new Error("Invalid origin " + e.origin);
  }
  message = JSON.parse(e.data);
  if (!message.id) {
    return;
  }
  return pendingMessages[message.id].resolve(message.result);
};

validateParent = function() {
  return postMessage({
    method: 'ping'
  });
};

isValidOrigin = function(origin) {
  var regex;
  regex = new RegExp("^https?://(\\w+\\.)?(\\w+\\.)?" + TRUSTED_DOMAIN + "/?$");
  return regex.test(origin);
};

SDK = (function() {
  function SDK() {
    this.version = 'v0.0.2';
    window.addEventListener('message', onMessage);
  }

  SDK.prototype._setInitialized = function(state) {
    return isInitialized = state;
  };

  SDK.prototype._setDebug = function(state) {
    return debug = state;
  };

  SDK.prototype._setFramed = function(state) {
    return IS_FRAMED = state;
  };

  SDK.prototype.init = function(opts) {
    gameId = opts != null ? opts.gameId : void 0;
    debug = Boolean(opts != null ? opts.debug : void 0);
    if (!gameId) {
      return new Promiz().reject(new Error('Missing gameId'));
    }
    if (IS_FRAMED) {
      return validateParent().then(function() {
        return postMessage({
          method: 'auth.getStatus'
        });
      }).then(function(_status) {
        isInitialized = true;
        return status = _status;
      });
    } else {
      return new Promiz().reject(new Error('Unframed Not Implemented'));
    }
  };

  SDK.prototype.login = function(_arg) {
    var scope;
    scope = _arg.scope;
    return new Promiz().reject(new Error('Not Implemented'));
  };

  SDK.prototype.api = function() {
    return new Promiz().reject(new Error('Not Implemented'));
  };

  SDK.prototype.client = function(message) {
    if (!isInitialized) {
      return new Promiz().reject(new Error('Must call Clay.init() first'));
    }
    if (!IS_FRAMED) {
      return new Promiz().reject(new Error('Missing parent frame. Make sure you are within a clay game running frame'));
    }
    return validateParent().then(function() {
      return postMessage(message);
    });
  };

  return SDK;

})();

module.exports = new SDK();



}).call(this,require('_process'))
},{"_process":3,"promiz":2}],2:[function(require,module,exports){
(function () {
  
  /**
   * @constructor
   */
  function Deferred(fn, er) {
    // states
    // 0: pending
    // 1: resolving
    // 2: rejecting
    // 3: resolved
    // 4: rejected
    var self = this,
      state = 0,
      val = 0,
      next = [];

    self['promise'] = self

    self['resolve'] = function (v) {
      if (!state) {
        val = v
        state = 1

        setTimeout(fire)
      }
      return this
    }

    self['reject'] = function (v) {
      if (!state) {
        val = v
        state = 2

        setTimeout(fire)
      }
      return this
    }

    self['then'] = function (fn, er) {
      var d = new Deferred(fn, er)
      if (state == 3) {
        d.resolve(val)
      }
      else if (state == 4) {
        d.reject(val)
      }
      else {
        next.push(d)
      }
      return d
    }

    var finish = function (type) {
      state = type || 4
      next.map(function (p) {
        state == 3 && p.resolve(val) || p.reject(val)
      })
    }

    // ref : reference to 'then' function
    // cb, ec, cn : successCallback, failureCallback, notThennableCallback
    function thennable (ref, cb, ec, cn) {
      if (typeof val == 'object' && typeof ref == 'function') {
        try {

          // cnt protects against abuse calls from spec checker
          var cnt = 0
          ref.call(val, function (v) {
            if (cnt++) return
            val = v
            cb()
          }, function (v) {
            if (cnt++) return
            val = v
            ec()
          })
        } catch (e) {
          val = e
          ec()
        }
      } else {
        cn()
      }
    };

    function fire() {

      // check if it's a thenable
      var ref;
      try {
        ref = val && val.then
      } catch (e) {
        val = e
        state = 2
        return fire()
      }

      thennable(ref, function () {
        state = 1
        fire()
      }, function () {
        state = 2
        fire()
      }, function () {
        try {
          if (state == 1 && typeof fn == 'function') {
            val = fn(val)
          }

          else if (state == 2 && typeof er == 'function') {
            val = er(val)
            state = 1
          }
        } catch (e) {
          val = e
          return finish()
        }

        if (val == self) {
          val = TypeError()
          finish()
        } else thennable(ref, function () {
            finish(3)
          }, finish, function () {
            finish(state == 1 && 3)
          })

      })
    }


  }

  // Export our library object, either for node.js or as a globally scoped variable
  if (typeof module != 'undefined') {
    module['exports'] = Deferred
  } else {
    this['Promiz'] = Deferred
  }
})()

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL3pvbGkvY2xheS9jbGF5LWphdmFzY3JpcHQtc2RrL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96b2xpL2NsYXkvY2xheS1qYXZhc2NyaXB0LXNkay9zcmMvY2xheV9zZGsuY29mZmVlIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvY29tcG9uZW50cy9wcm9taXovcHJvbWl6Lm1pY3JvLmpzIiwiL2hvbWUvem9saS9jbGF5L2NsYXktamF2YXNjcmlwdC1zZGsvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsb0pBQUE7O0FBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLENBQVQsQ0FBQTs7QUFBQSxjQUVBLEdBQWlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFaLElBQThCLFNBQS9CLENBQ2YsQ0FBQyxPQURjLENBQ04sS0FETSxFQUNDLEtBREQsQ0FGakIsQ0FBQTs7QUFBQSxTQUtBLEdBQVksTUFBTSxDQUFDLElBQVAsS0FBaUIsTUFBTSxDQUFDLEdBTHBDLENBQUE7O0FBQUEsZUFPQSxHQUFrQixFQVBsQixDQUFBOztBQUFBLGFBUUEsR0FBZ0IsS0FSaEIsQ0FBQTs7QUFBQSxNQVNBLEdBQVMsSUFUVCxDQUFBOztBQUFBLE1BVUEsR0FBUyxJQVZULENBQUE7O0FBQUEsS0FXQSxHQUFRLEtBWFIsQ0FBQTs7QUFBQSxXQWNBLEdBQWlCLENBQUEsU0FBQSxHQUFBO0FBQ2YsTUFBQSxTQUFBO0FBQUEsRUFBQSxTQUFBLEdBQVksQ0FBWixDQUFBO1NBRUEsU0FBQyxPQUFELEdBQUE7QUFDRSxRQUFBLGFBQUE7QUFBQSxJQUFBLFFBQUEsR0FBZSxJQUFBLE1BQUEsQ0FBQSxDQUFmLENBQUE7QUFFQTtBQUNFLE1BQUEsT0FBTyxDQUFDLEVBQVIsR0FBYSxTQUFiLENBQUE7QUFBQSxNQUNBLE9BQU8sQ0FBQyxNQUFSLEdBQWlCLE1BRGpCLENBQUE7QUFBQSxNQUVBLE9BQU8sQ0FBQyxXQUFSLG9CQUFzQixNQUFNLENBQUUsb0JBRjlCLENBQUE7QUFBQSxNQUlBLGVBQWdCLENBQUEsT0FBTyxDQUFDLEVBQVIsQ0FBaEIsR0FBOEIsUUFKOUIsQ0FBQTtBQUFBLE1BTUEsU0FBQSxJQUFhLENBTmIsQ0FBQTtBQUFBLE1BVUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFkLENBQTBCLElBQUksQ0FBQyxTQUFMLENBQWUsT0FBZixDQUExQixFQUFtRCxHQUFuRCxDQVZBLENBREY7S0FBQSxjQUFBO0FBY0UsTUFESSxZQUNKLENBQUE7QUFBQSxNQUFBLFFBQVEsQ0FBQyxNQUFULENBQWdCLEdBQWhCLENBQUEsQ0FkRjtLQUZBO0FBa0JBLFdBQU8sUUFBUCxDQW5CRjtFQUFBLEVBSGU7QUFBQSxDQUFBLENBQUgsQ0FBQSxDQWRkLENBQUE7O0FBQUEsU0FzQ0EsR0FBWSxTQUFDLENBQUQsR0FBQTtBQUNWLE1BQUEsT0FBQTtBQUFBLEVBQUEsSUFBRyxDQUFBLEtBQUEsSUFBYyxDQUFBLGFBQUksQ0FBYyxDQUFDLENBQUMsTUFBaEIsQ0FBckI7QUFDRSxVQUFVLElBQUEsS0FBQSxDQUFPLGlCQUFBLEdBQWlCLENBQUMsQ0FBQyxNQUExQixDQUFWLENBREY7R0FBQTtBQUFBLEVBR0EsT0FBQSxHQUFVLElBQUksQ0FBQyxLQUFMLENBQVcsQ0FBQyxDQUFDLElBQWIsQ0FIVixDQUFBO0FBS0EsRUFBQSxJQUFBLENBQUEsT0FBYyxDQUFDLEVBQWY7QUFDRSxVQUFBLENBREY7R0FMQTtTQVFBLGVBQWdCLENBQUEsT0FBTyxDQUFDLEVBQVIsQ0FBVyxDQUFDLE9BQTVCLENBQW9DLE9BQU8sQ0FBQyxNQUE1QyxFQVRVO0FBQUEsQ0F0Q1osQ0FBQTs7QUFBQSxjQW9EQSxHQUFpQixTQUFBLEdBQUE7U0FDZixXQUFBLENBQ0U7QUFBQSxJQUFBLE1BQUEsRUFBUSxNQUFSO0dBREYsRUFEZTtBQUFBLENBcERqQixDQUFBOztBQUFBLGFBd0RBLEdBQWdCLFNBQUMsTUFBRCxHQUFBO0FBQ2QsTUFBQSxLQUFBO0FBQUEsRUFBQSxLQUFBLEdBQVksSUFBQSxNQUFBLENBQVEsZ0NBQUEsR0FBZ0MsY0FBaEMsR0FBK0MsS0FBdkQsQ0FBWixDQUFBO0FBQ0EsU0FBTyxLQUFLLENBQUMsSUFBTixDQUFXLE1BQVgsQ0FBUCxDQUZjO0FBQUEsQ0F4RGhCLENBQUE7O0FBQUE7QUErRGUsRUFBQSxhQUFBLEdBQUE7QUFDWCxJQUFBLElBQUMsQ0FBQSxPQUFELEdBQVcsUUFBWCxDQUFBO0FBQUEsSUFDQSxNQUFNLENBQUMsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsU0FBbkMsQ0FEQSxDQURXO0VBQUEsQ0FBYjs7QUFBQSxnQkFLQSxlQUFBLEdBQWlCLFNBQUMsS0FBRCxHQUFBO1dBQ2YsYUFBQSxHQUFnQixNQUREO0VBQUEsQ0FMakIsQ0FBQTs7QUFBQSxnQkFRQSxTQUFBLEdBQVcsU0FBQyxLQUFELEdBQUE7V0FDVCxLQUFBLEdBQVEsTUFEQztFQUFBLENBUlgsQ0FBQTs7QUFBQSxnQkFXQSxVQUFBLEdBQVksU0FBQyxLQUFELEdBQUE7V0FDVixTQUFBLEdBQVksTUFERjtFQUFBLENBWFosQ0FBQTs7QUFBQSxnQkFlQSxJQUFBLEdBQU0sU0FBQyxJQUFELEdBQUE7QUFDSixJQUFBLE1BQUEsa0JBQVMsSUFBSSxDQUFFLGVBQWYsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLE9BQUEsZ0JBQVEsSUFBSSxDQUFFLGNBQWQsQ0FEUixDQUFBO0FBR0EsSUFBQSxJQUFBLENBQUEsTUFBQTtBQUNFLGFBQVcsSUFBQSxNQUFBLENBQUEsQ0FBUSxDQUFDLE1BQVQsQ0FBb0IsSUFBQSxLQUFBLENBQU0sZ0JBQU4sQ0FBcEIsQ0FBWCxDQURGO0tBSEE7QUFNQSxJQUFBLElBQUcsU0FBSDtBQUNFLGFBQU8sY0FBQSxDQUFBLENBQ1AsQ0FBQyxJQURNLENBQ0QsU0FBQSxHQUFBO2VBQ0osV0FBQSxDQUNFO0FBQUEsVUFBQSxNQUFBLEVBQVEsZ0JBQVI7U0FERixFQURJO01BQUEsQ0FEQyxDQUlQLENBQUMsSUFKTSxDQUlELFNBQUMsT0FBRCxHQUFBO0FBQ0osUUFBQSxhQUFBLEdBQWdCLElBQWhCLENBQUE7ZUFFQSxNQUFBLEdBQVMsUUFITDtNQUFBLENBSkMsQ0FBUCxDQURGO0tBQUEsTUFBQTtBQVVFLGFBQVcsSUFBQSxNQUFBLENBQUEsQ0FBUSxDQUFDLE1BQVQsQ0FBb0IsSUFBQSxLQUFBLENBQU0sMEJBQU4sQ0FBcEIsQ0FBWCxDQVZGO0tBUEk7RUFBQSxDQWZOLENBQUE7O0FBQUEsZ0JBa0NBLEtBQUEsR0FBTyxTQUFDLElBQUQsR0FBQTtBQUVMLFFBQUEsS0FBQTtBQUFBLElBRk8sUUFBRCxLQUFDLEtBRVAsQ0FBQTtBQUFBLFdBQVcsSUFBQSxNQUFBLENBQUEsQ0FBUSxDQUFDLE1BQVQsQ0FBb0IsSUFBQSxLQUFBLENBQU0saUJBQU4sQ0FBcEIsQ0FBWCxDQUZLO0VBQUEsQ0FsQ1AsQ0FBQTs7QUFBQSxnQkFzQ0EsR0FBQSxHQUFLLFNBQUEsR0FBQTtBQUVILFdBQVcsSUFBQSxNQUFBLENBQUEsQ0FBUSxDQUFDLE1BQVQsQ0FBb0IsSUFBQSxLQUFBLENBQU0saUJBQU4sQ0FBcEIsQ0FBWCxDQUZHO0VBQUEsQ0F0Q0wsQ0FBQTs7QUFBQSxnQkEwQ0EsTUFBQSxHQUFRLFNBQUMsT0FBRCxHQUFBO0FBQ04sSUFBQSxJQUFBLENBQUEsYUFBQTtBQUNFLGFBQVcsSUFBQSxNQUFBLENBQUEsQ0FBUSxDQUFDLE1BQVQsQ0FBb0IsSUFBQSxLQUFBLENBQU0sNkJBQU4sQ0FBcEIsQ0FBWCxDQURGO0tBQUE7QUFHQSxJQUFBLElBQUEsQ0FBQSxTQUFBO0FBQ0UsYUFBVyxJQUFBLE1BQUEsQ0FBQSxDQUFRLENBQUMsTUFBVCxDQUFvQixJQUFBLEtBQUEsQ0FBTSwwRUFBTixDQUFwQixDQUFYLENBREY7S0FIQTtXQVFBLGNBQUEsQ0FBQSxDQUNBLENBQUMsSUFERCxDQUNNLFNBQUEsR0FBQTthQUNKLFdBQUEsQ0FBWSxPQUFaLEVBREk7SUFBQSxDQUROLEVBVE07RUFBQSxDQTFDUixDQUFBOzthQUFBOztJQS9ERixDQUFBOztBQUFBLE1BeUhNLENBQUMsT0FBUCxHQUFxQixJQUFBLEdBQUEsQ0FBQSxDQXpIckIsQ0FBQTs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJQcm9taXogPSByZXF1aXJlICdwcm9taXonXG5cblRSVVNURURfRE9NQUlOID0gKHByb2Nlc3MuZW52LlRSVVNURURfRE9NQUlOIG9yICdjbGF5LmlvJylcbiAgLnJlcGxhY2UoL1xcLi9nLCAnXFxcXC4nKVxuXG5JU19GUkFNRUQgPSB3aW5kb3cuc2VsZiBpc250IHdpbmRvdy50b3BcblxucGVuZGluZ01lc3NhZ2VzID0ge31cbmlzSW5pdGlhbGl6ZWQgPSBmYWxzZVxuZ2FtZUlkID0gbnVsbFxuc3RhdHVzID0gbnVsbFxuZGVidWcgPSBmYWxzZVxuXG5cbnBvc3RNZXNzYWdlID0gZG8gLT5cbiAgbWVzc2FnZUlkID0gMVxuXG4gIChtZXNzYWdlKSAtPlxuICAgIGRlZmVycmVkID0gbmV3IFByb21peigpXG5cbiAgICB0cnlcbiAgICAgIG1lc3NhZ2UuaWQgPSBtZXNzYWdlSWRcbiAgICAgIG1lc3NhZ2UuZ2FtZUlkID0gZ2FtZUlkXG4gICAgICBtZXNzYWdlLmFjY2Vzc1Rva2VuID0gc3RhdHVzPy5hY2Nlc3NUb2tlblxuXG4gICAgICBwZW5kaW5nTWVzc2FnZXNbbWVzc2FnZS5pZF0gPSBkZWZlcnJlZFxuXG4gICAgICBtZXNzYWdlSWQgKz0gMVxuXG4gICAgICAjIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHRlbGwgd2hvIHRoZSBwYXJlbnQgaXMgaGVyZVxuICAgICAgIyBUaGUgY2xpZW50IGhhcyB0byBwaW5nIHRoZSBwYXJlbnQgYW5kIGdldCBhIHJlc3BvbnNlIHRvIHZlcmlmeVxuICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgJyonXG5cbiAgICBjYXRjaCBlcnJcbiAgICAgIGRlZmVycmVkLnJlamVjdCBlcnJcblxuICAgIHJldHVybiBkZWZlcnJlZFxuXG5vbk1lc3NhZ2UgPSAoZSkgLT5cbiAgaWYgbm90IGRlYnVnIGFuZCBub3QgaXNWYWxpZE9yaWdpbiBlLm9yaWdpblxuICAgIHRocm93IG5ldyBFcnJvciBcIkludmFsaWQgb3JpZ2luICN7ZS5vcmlnaW59XCJcblxuICBtZXNzYWdlID0gSlNPTi5wYXJzZSBlLmRhdGFcblxuICB1bmxlc3MgbWVzc2FnZS5pZFxuICAgIHJldHVyblxuXG4gIHBlbmRpbmdNZXNzYWdlc1ttZXNzYWdlLmlkXS5yZXNvbHZlIG1lc3NhZ2UucmVzdWx0XG5cblxuIyBUaGlzIGlzIHVzZWQgdG8gdmVyaWZ5IHRoYXQgdGhlIHBhcmVudCBpcyBjbGF5LmlvXG4jIElmIGl0J3Mgbm90LCB0aGUgcG9zdE1lc3NhZ2UgcHJvbWlzZSB3aWxsIGZhaWwgYmVjYXVzZSBvZiBvbk1lc3NhZ2UgY2hlY2tcbnZhbGlkYXRlUGFyZW50ID0gLT5cbiAgcG9zdE1lc3NhZ2VcbiAgICBtZXRob2Q6ICdwaW5nJ1xuXG5pc1ZhbGlkT3JpZ2luID0gKG9yaWdpbikgLT5cbiAgcmVnZXggPSBuZXcgUmVnRXhwIFwiXmh0dHBzPzovLyhcXFxcdytcXFxcLik/KFxcXFx3K1xcXFwuKT8je1RSVVNURURfRE9NQUlOfS8/JFwiXG4gIHJldHVybiByZWdleC50ZXN0IG9yaWdpblxuXG5cblxuY2xhc3MgU0RLXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEB2ZXJzaW9uID0gJ3YwLjAuMidcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbWVzc2FnZScsIG9uTWVzc2FnZVxuXG4gICMgRk9SIFRFU1RJTkcgT05MWVxuICBfc2V0SW5pdGlhbGl6ZWQ6IChzdGF0ZSkgLT5cbiAgICBpc0luaXRpYWxpemVkID0gc3RhdGVcblxuICBfc2V0RGVidWc6IChzdGF0ZSkgLT5cbiAgICBkZWJ1ZyA9IHN0YXRlXG5cbiAgX3NldEZyYW1lZDogKHN0YXRlKSAtPlxuICAgIElTX0ZSQU1FRCA9IHN0YXRlXG5cbiAgIyBQdWJsaWNcbiAgaW5pdDogKG9wdHMpIC0+XG4gICAgZ2FtZUlkID0gb3B0cz8uZ2FtZUlkXG4gICAgZGVidWcgPSBCb29sZWFuIG9wdHM/LmRlYnVnXG5cbiAgICB1bmxlc3MgZ2FtZUlkXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ01pc3NpbmcgZ2FtZUlkJ1xuXG4gICAgaWYgSVNfRlJBTUVEXG4gICAgICByZXR1cm4gdmFsaWRhdGVQYXJlbnQoKVxuICAgICAgLnRoZW4gLT5cbiAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICBtZXRob2Q6ICdhdXRoLmdldFN0YXR1cydcbiAgICAgIC50aGVuIChfc3RhdHVzKSAtPlxuICAgICAgICBpc0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAjIFRPRE86IFRva2VuIG1heSBiZSBpbnZhbGlkXG4gICAgICAgIHN0YXR1cyA9IF9zdGF0dXNcbiAgICBlbHNlXG4gICAgICByZXR1cm4gbmV3IFByb21peigpLnJlamVjdCBuZXcgRXJyb3IgJ1VuZnJhbWVkIE5vdCBJbXBsZW1lbnRlZCdcblxuICBsb2dpbjogKHtzY29wZX0pIC0+XG4gICAgIyBUT0RPOiBPQXV0aCBtYWdpYy4gR2V0cyB0b2tlblxuICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTm90IEltcGxlbWVudGVkJ1xuXG4gIGFwaTogLT5cbiAgICAjIFRPRE86IGltcGxlbWVudFxuICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTm90IEltcGxlbWVudGVkJ1xuXG4gIGNsaWVudDogKG1lc3NhZ2UpIC0+XG4gICAgdW5sZXNzIGlzSW5pdGlhbGl6ZWRcbiAgICAgIHJldHVybiBuZXcgUHJvbWl6KCkucmVqZWN0IG5ldyBFcnJvciAnTXVzdCBjYWxsIENsYXkuaW5pdCgpIGZpcnN0J1xuXG4gICAgdW5sZXNzIElTX0ZSQU1FRFxuICAgICAgcmV0dXJuIG5ldyBQcm9taXooKS5yZWplY3QgbmV3IEVycm9yICdNaXNzaW5nIHBhcmVudCBmcmFtZS4gTWFrZSBzdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlvdSBhcmUgd2l0aGluIGEgY2xheSBnYW1lIHJ1bm5pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUnXG5cbiAgICB2YWxpZGF0ZVBhcmVudCgpXG4gICAgLnRoZW4gLT5cbiAgICAgIHBvc3RNZXNzYWdlIG1lc3NhZ2VcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU0RLKClcbiIsIihmdW5jdGlvbiAoKSB7XG4gIFxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBEZWZlcnJlZChmbiwgZXIpIHtcbiAgICAvLyBzdGF0ZXNcbiAgICAvLyAwOiBwZW5kaW5nXG4gICAgLy8gMTogcmVzb2x2aW5nXG4gICAgLy8gMjogcmVqZWN0aW5nXG4gICAgLy8gMzogcmVzb2x2ZWRcbiAgICAvLyA0OiByZWplY3RlZFxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHN0YXRlID0gMCxcbiAgICAgIHZhbCA9IDAsXG4gICAgICBuZXh0ID0gW107XG5cbiAgICBzZWxmWydwcm9taXNlJ10gPSBzZWxmXG5cbiAgICBzZWxmWydyZXNvbHZlJ10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMVxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsncmVqZWN0J10gPSBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKCFzdGF0ZSkge1xuICAgICAgICB2YWwgPSB2XG4gICAgICAgIHN0YXRlID0gMlxuXG4gICAgICAgIHNldFRpbWVvdXQoZmlyZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc2VsZlsndGhlbiddID0gZnVuY3Rpb24gKGZuLCBlcikge1xuICAgICAgdmFyIGQgPSBuZXcgRGVmZXJyZWQoZm4sIGVyKVxuICAgICAgaWYgKHN0YXRlID09IDMpIHtcbiAgICAgICAgZC5yZXNvbHZlKHZhbClcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHN0YXRlID09IDQpIHtcbiAgICAgICAgZC5yZWplY3QodmFsKVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQucHVzaChkKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGRcbiAgICB9XG5cbiAgICB2YXIgZmluaXNoID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgIHN0YXRlID0gdHlwZSB8fCA0XG4gICAgICBuZXh0Lm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgICBzdGF0ZSA9PSAzICYmIHAucmVzb2x2ZSh2YWwpIHx8IHAucmVqZWN0KHZhbClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gcmVmIDogcmVmZXJlbmNlIHRvICd0aGVuJyBmdW5jdGlvblxuICAgIC8vIGNiLCBlYywgY24gOiBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgbm90VGhlbm5hYmxlQ2FsbGJhY2tcbiAgICBmdW5jdGlvbiB0aGVubmFibGUgKHJlZiwgY2IsIGVjLCBjbikge1xuICAgICAgaWYgKHR5cGVvZiB2YWwgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHJlZiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAvLyBjbnQgcHJvdGVjdHMgYWdhaW5zdCBhYnVzZSBjYWxscyBmcm9tIHNwZWMgY2hlY2tlclxuICAgICAgICAgIHZhciBjbnQgPSAwXG4gICAgICAgICAgcmVmLmNhbGwodmFsLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgaWYgKGNudCsrKSByZXR1cm5cbiAgICAgICAgICAgIHZhbCA9IHZcbiAgICAgICAgICAgIGVjKClcbiAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIGVjKClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY24oKVxuICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBmaXJlKCkge1xuXG4gICAgICAvLyBjaGVjayBpZiBpdCdzIGEgdGhlbmFibGVcbiAgICAgIHZhciByZWY7XG4gICAgICB0cnkge1xuICAgICAgICByZWYgPSB2YWwgJiYgdmFsLnRoZW5cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdmFsID0gZVxuICAgICAgICBzdGF0ZSA9IDJcbiAgICAgICAgcmV0dXJuIGZpcmUoKVxuICAgICAgfVxuXG4gICAgICB0aGVubmFibGUocmVmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0YXRlID0gMVxuICAgICAgICBmaXJlKClcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUgPSAyXG4gICAgICAgIGZpcmUoKVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PSAxICYmIHR5cGVvZiBmbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YWwgPSBmbih2YWwpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxzZSBpZiAoc3RhdGUgPT0gMiAmJiB0eXBlb2YgZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdmFsID0gZXIodmFsKVxuICAgICAgICAgICAgc3RhdGUgPSAxXG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdmFsID0gZVxuICAgICAgICAgIHJldHVybiBmaW5pc2goKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbCA9PSBzZWxmKSB7XG4gICAgICAgICAgdmFsID0gVHlwZUVycm9yKClcbiAgICAgICAgICBmaW5pc2goKVxuICAgICAgICB9IGVsc2UgdGhlbm5hYmxlKHJlZiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZmluaXNoKDMpXG4gICAgICAgICAgfSwgZmluaXNoLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaW5pc2goc3RhdGUgPT0gMSAmJiAzKVxuICAgICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuXG5cbiAgfVxuXG4gIC8vIEV4cG9ydCBvdXIgbGlicmFyeSBvYmplY3QsIGVpdGhlciBmb3Igbm9kZS5qcyBvciBhcyBhIGdsb2JhbGx5IHNjb3BlZCB2YXJpYWJsZVxuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZVsnZXhwb3J0cyddID0gRGVmZXJyZWRcbiAgfSBlbHNlIHtcbiAgICB0aGlzWydQcm9taXonXSA9IERlZmVycmVkXG4gIH1cbn0pKClcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
