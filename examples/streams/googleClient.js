/*** Generated by streamline 0.1.36-stack - DO NOT EDIT ***/
var __global = typeof global !== 'undefined' ? global : window;__global.__setEF=__global.__setEF||function(e,f){e.__frame = e.__frame||f};var __srcName='streamline/examples/streams/googleClient_.js';
function __func(_, __this, __arguments, fn, index, frame, body) { if (!_) { return __future.call(__this, fn, __arguments, index); } frame.file = __srcName; frame.prev = __global.__frame; __global.__frame = frame; try { body(); } catch (e) { __global.__setEF(e, frame.prev); __propagate(_, e); } finally { __global.__frame = __frame.prev; } }
function __cb(_, frame, offset, col, fn){ frame.offset = offset; frame.col = col; var ctx = __global.__context; return function ___(err, result){ var oldFrame = __global.__frame; __global.__frame = frame; __global.__context = ctx; try { if (err) { __global.__setEF(err, frame); return _(err); } return fn(null, result); } catch (ex) { __global.__setEF(ex, frame); return __propagate(_, ex); } finally { __global.__frame = oldFrame; } } }
function __future(fn, args, i){ var done, err, result; var cb = function(e, r){ done = true; err = e, result = r; }; args = Array.prototype.slice.call(args); args[i] = function ___(e, r){ cb(e, r); }; fn.apply(this, args); return function ___(_){ if (done) _.call(this, err, result); else cb = _.bind(this); } .bind(this); }
function __propagate(_, err){ try { _(err); } catch (ex) { __trap(ex); } }
function __trap(err){ if (err) { if (__global.__context && __global.__context.errorHandler) __global.__context.errorHandler(err); else console.error("UNCAUGHT EXCEPTION: " + err.message + "\n" + err.stack); } }
            (function main(_) {
              var streams, str, result, formatted;
/*    10 */   function google(str, _) {
                var req, resp;
                var __frame = {
                  name: "google",
                  line: 10
                };
                return __func(_, this, arguments, google, 1, __frame, function __$google() {
/*    16 */       req = streams.httpRequest({
/*    17 */         url: ("http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=" + str),
/*    18 */         proxy: process.env.http_proxy
                  });
/*    25 */       return req.end().response(__cb(_, __frame, 15, 12, function ___(__0, __1) {
                    resp = __1;
/*    27 */         return resp.checkStatus(200).readAll(__cb(_, __frame, 17, 19, function ___(__0, __3) {
/*    27 */           var __2 = JSON.parse(__3);
                      return _(null, __2);
                    }));
                  }));
                });
              };
              var __frame = {
                name: "main",
                line: 1
              };
              return __func(_, this, arguments, main, 0, __frame, function __$main() {
/*     8 */     streams = require("streamline/lib/streams/server/streams");
/*    31 */     str = ((process.argv.length > 2) ? process.argv[2] : "node.js");
/*    34 */     return google(str, __cb(_, __frame, 33, 13, function ___(__0, __1) {
                  result = __1;
/*    39 */       formatted = result.responseData.results.map(function(entry) {
/*    38 */         return ((entry.url + "\n	") + entry.titleNoFormatting);
/*    39 */       }).join("\n");
/*    40 */       console.log(formatted);
                  _();
                }));
              });
            }).call(this, __trap);
