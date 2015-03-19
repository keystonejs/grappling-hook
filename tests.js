'use strict';
/* global describe, it, beforeEach */
/* jshint unused:false */

var expect = require('must');
var subject = require('./index');
var sinon = require('sinon');

var MEMBERS = ['pre', 'post', 'hook', 'unhook', 'allowHooks', 'addHooks', 'callHook', 'getMiddleware', 'hasMiddleware', '__grappling'];
var PRE_TEST = 'pre:test';
var POST_TEST = 'post:test';

describe('-- grappling-hook --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});
	describe('module', function() {
		it('should expose a `mixin` function', function() {
			expect(subject.mixin).to.be.a.function();
		});
		it('should expose a `create` function', function() {
			expect(subject.create).to.be.a.function();
		});
		it('should expose an `attach` function', function() {
			expect(subject.attach).to.be.a.function();
		});
	});
	describe('#mixin', function() {
		it('should add grappling-hook functions to an existing object', function() {
			var instance = {};
			subject.mixin(instance);
			expect(instance).to.have.keys(MEMBERS);
		});
	});
	describe('#create', function() {
		it('should return a grappling-hook object', function() {
			var instance = subject.create();
			expect(instance).to.have.keys(MEMBERS);
		});
	});
	describe('#attach', function() {
		//todo: make sure this _really_ works as intended
	});
	describe('instance', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create();
		});
		describe('#allowHooks', function() {
			var hook;
			beforeEach(function() {
				hook = sinon.spy();
			});
			it('should throw an error for anything else but `pre` or `post`', function() {
				expect(function() {
					instance.allowHooks('nope:not valid!');
				}).to.throw(/pre|post/);
			});
			it('should register a qualified hook', function() {
				instance.allowHooks(PRE_TEST);
				instance.hook(PRE_TEST, hook)
					.callHook(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept multiple qualified hooks', function() {
				instance.allowHooks(POST_TEST, PRE_TEST)
					.hook(PRE_TEST, hook)
					.callHook(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an array of qualified hooks', function() {
				instance.allowHooks([POST_TEST, PRE_TEST])
					.hook(PRE_TEST, hook)
					.callHook(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an action and register both hooks', function() {
				instance.allowHooks('test')
					.hook(PRE_TEST, hook)
					.hook(POST_TEST, hook)
					.callHook(PRE_TEST)
					.callHook(POST_TEST);
				expect(hook.callCount).to.equal(2);
			});
		});
		describe('#hook', function() {
			var callback;
			beforeEach(function() {
				callback = sinon.spy();
				instance.allowHooks('test');
			});
			it('should throw an error for unqualified hooks', function() {
				expect(function() {
					instance.hook('test');
				}).to.throw(/qualified/);
			});
			it('should throw an error for a non-existing hook', function() {
				expect(function() {
					instance.hook('pre:notAllowed');
				}).to.throw(/not supported/);
			});
			it('should register a single callback', function() {
				instance.hook(PRE_TEST, callback)
					.callHook(PRE_TEST)
					.callHook(POST_TEST);
				expect(callback.callCount).to.equal(1);
			});
			it('should register multiple callbacks', function() {
				instance.hook(PRE_TEST, callback, callback, callback)
					.callHook(PRE_TEST);
				expect(callback.callCount).to.equal(3);
			});
			it('should register an array of callbacks', function() {
				var hooks = [callback, callback, callback];
				instance.hook(PRE_TEST, hooks)
					.callHook(PRE_TEST);
				expect(callback.callCount).to.equal(hooks.length);
			});
		});
		describe('#getMiddleware', function() {
			var callback;
			beforeEach(function() {
				callback = function() {
				};
				instance.allowHooks(PRE_TEST);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.getMiddleware('test');
				}).to.throw(/qualified/);
			});
			it('should return empty array if no callbacks are registered for the hook', function() {
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should retrieve all callbacks for a hook', function() {
				var actual = instance.hook(PRE_TEST, callback)
					.getMiddleware(PRE_TEST);
				expect(actual).to.eql([callback]);
			});
		});
		describe('#hasMiddleware', function() {
			var callback;
			beforeEach(function() {
				callback = function() {
				};
				instance.allowHooks(PRE_TEST);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.hasMiddleware('test');
				}).to.throw(/qualified/);
			});
			it('should return `false` if no callbacks are registered for the hook', function() {
				var actual = instance.hasMiddleware(PRE_TEST);
				expect(actual).to.be.false();
			});
			it('should return `true` if callbacks are registered for the hook', function() {
				var actual = instance.hook(PRE_TEST, callback)
					.hasMiddleware(PRE_TEST);
				expect(actual).to.be.true();
			});
		});
		describe('#callHook', function() {
			var callback,
				passed,
				foo = {},
				bar = {};
			beforeEach(function() {
				passed = {
					scope: undefined,
					args : undefined,
					async: false
				};
				callback = function(foo,
									bar,
									next) {
					passed.args = [foo, bar];
					passed.scope = this;
					setTimeout(function() {
						passed.async = true;
						next();
					}, 0);
				};
				instance.allowHooks('test')
					.hook(PRE_TEST, callback);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.callHook('test');
				}).to.throw(/qualified/);
			});
			it('should pass `...parameters` to callbacks', function() {
				instance.callHook(PRE_TEST, foo, bar);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass `parameters[]` to callbacks', function() {
				instance.callHook(PRE_TEST, [foo, bar]);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('execute callbacks in scope `context`', function() {
				instance.hook(PRE_TEST, callback);
				var context = {};
				instance.callHook(context, PRE_TEST, [foo, bar]);
				expect(passed.scope).to.equal(context);
			});
			it('should call `callback` when all callbacks have been called', function(done) {
				instance.callHook(PRE_TEST, [foo, bar], function() {
					expect(passed.async).to.be.true();
					done();
				});
			});
		});
		describe('#unhook', function() {
			var c1, c2;
			beforeEach(function() {
				instance.allowHooks('test');
				c1 = function() {
				};
				c2 = function() {
				};
			});
			it('should remove specific callbacks for a qualified hook', function() {
				instance.hook(PRE_TEST, c1, c2)
					.unhook(PRE_TEST, c1);
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([c2]);
			});
			it('should remove all callbacks for a qualified hook', function() {
				instance.hook(PRE_TEST, c1, c2)
					.unhook(PRE_TEST);
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should remove all callbacks ', function() {
				instance
					.hook(PRE_TEST, c1, c2)
					.hook(POST_TEST, c1, c2)
					.unhook()
				;
				expect(instance.getMiddleware(PRE_TEST)).to.eql([]);
				expect(instance.getMiddleware(POST_TEST)).to.eql([]);
			});
			it('should throw an error if callbacks are provided for an unqualified hook', function() {
				instance.hook(PRE_TEST, c1, c2);
				expect(function() {
					instance.unhook('test', c1);
				}).to.throw(/qualified/);
			});
		});
	});
});

