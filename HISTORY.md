# GrapplingHook Changelog

## v3.0.0 / 2015-08-20

* changed; BREAKING - remove parameter flattening from `callHook`, `callSyncHook` and `callThenableHook`
* changed; when no callback is provided to `pre/post/hook` return a thenable
* added; `module.isThenable`
* added; `addThenableHooks` and `callThenableHook`
* added; allow thenable middleware
* fixed; bug with incorrectly passed options in module.attach
* added; aliases `addAsyncHooks` and `callAsyncHook`
* changed; allow passing multiple qualified hooks to `hookable`
* fixed; major bug with shared caches in grappling hook objects when attaching to prototype
* changed; bumped dependencies
* improved; tests
* changed; sync middleware errors caught in async hooks
* added; storage and retrieval of presets
* improved; sync hooks

## v2.5.0 / 2015-06-03

* fixed; bug with parallel middleware passing errors incorrectly due to overzealous dezalgofication
* fixed; bug with final callback being called too soon in wrapped methods w/o registered post middleware
* improved; drop unnecessary default value for `args` in `iterateAsyncMiddleware
* fixed; #11 incorrectly passed parameters from wrapped methods
* fixed; #10 examples

## v2.4.0 / 2015-05-12

* added; `addSyncHooks` and `callSyncHook` for wrapping and executing hooks synchronously.

## v2.3.0 / 2015-05-08

* added; allow configuration of other qualifiers than `pre` and `post`

## v2.2.0 / 2015-05-08

* improved; tests
* changed; bubble errors from sync middleware

## v2.1.2 / 2015-04-28

* improved; dezalgofy middleware callbacks, i.e. enforce asynchronous resolution
* improved; tests

## v2.1.1 / 2015-04-28

* fixed; incorrect handling of callback argument in wrapped methods
* improved; tests

## v2.1.0 / 2015-04-27

* improved; error handling
* added; parallel middleware handling

## v2.0.0 / 2015-04-25

* changed; bumped dependencies
* changed; dropped asyncdi dependency
* changed; BREAKING - allow async callbacks with any parameter name

## v1.0.0 / 2015-03-23

* added; initial version allowing pre/post hooking with synchronous and asynchronous middleware
