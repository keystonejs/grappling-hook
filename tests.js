'use strict';
/* global describe, it, beforeEach */
/* jshint unused:false */

var expect = require('must');
var subject = require('./index');
var sinon = require('sinon');

var MEMBERS = ['pre', 'post', 'hook', 'unhook', 'allowHooks', 'addHooks', 'callHook', 'getMiddleware', 'hasMiddleware', 'hookable', '__grappling'];
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
		var Clazz = function() {
		};
		it('should return the original class', function() {
			var ModifiedClazz = subject.attach(Clazz);
			expect(ModifiedClazz).to.equal(Clazz);
		});
		it('should add grappling-hook methods to the prototype', function() {
			var ModifiedClazz = subject.attach(Clazz),
				instance = new ModifiedClazz();
			expect(instance).to.be.an.instanceOf(Clazz);
			expect(instance).to.have.keys(MEMBERS);
		});
		it('should make a functional prototype', function() {
			subject.attach(Clazz);
			var instance = new Clazz();
			var called = false;
			instance.allowHooks(PRE_TEST)
				.hook(PRE_TEST, function() {
					called = true;
				})
				.callHook(PRE_TEST);
			expect(called).to.be.true();
		});
	});
	describe('strict instance', function() {
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
		describe('#hookable', function() {
			beforeEach(function() {
				instance.allowHooks(PRE_TEST);
			});
			it('should return `true` if allowed', function() {
				expect(instance.hookable(PRE_TEST)).to.be.true();
			});
			it('should return `false` if not allowed', function() {
				expect(instance.hookable(POST_TEST)).to.be.false();
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
			it('should return empty array if the hook does not exist', function() {
				var actual = instance.getMiddleware('pre:nonexistant');
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
			it('execute callbacks in scope `instance` by default', function() {
				instance.hook(PRE_TEST, callback);
				instance.callHook(PRE_TEST, [foo, bar]);
				expect(passed.scope).to.equal(instance);
			});
			it('should call `callback` when all callbacks have been called', function(done) {
				instance.callHook(PRE_TEST, [foo, bar], function() {
					expect(passed.async).to.be.true();
					done();
				});
			});
			it('should pass `err` to `callback` if a middleware passed it through', function(done) {
				var error = new Error('middleware error');
				instance.hook(POST_TEST, function(next) {
					next(error);
				}).callHook(POST_TEST, function(err) {
					expect(err).to.equal(error);
					done();
				});
			});
			it('should stop execution of middleware if an error was passed through', function(done) {
				var error = new Error('middleware error');
				var shouldNotBeCalled = true;
				instance.hook(POST_TEST, function(next) {
					next(error);
				}, function() {
					shouldNotBeCalled = false;
				}).callHook(POST_TEST, function() {
					expect(shouldNotBeCalled).to.be.true();
					done();
				});
			});
			it('should throw middleware errors by default', function() {
				var error = new Error('middleware error');

				instance.hook(POST_TEST, function(next) {
					next(error);
				});
				expect(function() {
					instance.callHook(POST_TEST);
				}).to.throw(error.message);
			});
		});
		describe('#unhook', function() {
			var c1, c2;
			beforeEach(function() {
				c1 = function() {
				};
				c2 = function() {
				};
			});
			it('should remove specified callbacks for a qualified hook', function() {
				instance.allowHooks(PRE_TEST)
					.hook(PRE_TEST, c1, c2)
					.unhook(PRE_TEST, c1);
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([c2]);
			});
			it('should remove all callbacks for a qualified hook', function() {
				instance.allowHooks(PRE_TEST)
					.hook(PRE_TEST, c1, c2)
					.unhook(PRE_TEST);
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should remove all callbacks for an unqualified hook', function() {
				instance.allowHooks('test')
					.hook(PRE_TEST, c1, c2)
					.hook(POST_TEST, c1, c2)
					.unhook('test');
				var actual = instance.getMiddleware(PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should throw an error if callbacks are specified for an unqualified hook', function() {
				instance.allowHooks(PRE_TEST)
					.hook(PRE_TEST, c1, c2);
				expect(function() {
					instance.unhook('test', c1);
				}).to.throw(/qualified/);
			});
			it('should remove all callbacks ', function() {
				instance.allowHooks('test')
					.hook(PRE_TEST, c1, c2)
					.hook(POST_TEST, c1, c2)
					.unhook()
				;
				expect(instance.getMiddleware(PRE_TEST)).to.eql([]);
				expect(instance.getMiddleware(POST_TEST)).to.eql([]);
			});
			it('should not turn disallowed hooks into allowed hooks', function() {
				instance.allowHooks(PRE_TEST)
					.unhook('test');
				expect(instance.hookable(PRE_TEST)).to.be.true();
				expect(instance.hookable(POST_TEST)).to.be.false();
			});
			it('should not disallow all hooks', function() {
				instance.allowHooks(PRE_TEST)
					.unhook();
				expect(instance.hookable(PRE_TEST)).to.be.true();
				expect(instance.hookable(POST_TEST)).to.be.false();
			});
		});
		describe('#addHooks', function() {
			var pre,
				original,
				post,
				called;
			beforeEach(function() {
				called = [];
				pre = function() {
					called.push('pre');
				};
				original = function(done) {
					setTimeout(function() {
						called.push('original');
						done && done();
					}, 0);
				};
				post = function() {
					called.push('post');
				};
				instance.test = original;
			});
			it('should add a qualified hook to an existing method', function(done) {
				instance.addHooks(PRE_TEST)
					.hook(PRE_TEST, pre)
					.test(function() {
						expect(called).to.eql(['pre', 'original']);
						done();
					});
			});
			it('should add all qualified hooks to an existing method', function(done) {
				instance.addHooks(PRE_TEST, POST_TEST)
					.pre('test', pre)
					.post('test', post)
					.test(function() {
						expect(called).to.eql(['pre', 'original', 'post']);
						done();
					});
			});
			it('should add pre and post for unqualified hooks to an existing method', function(done) {
				instance.addHooks('test')
					.pre('test', pre)
					.post('test', post)
					.test(function() {
						expect(called).to.eql(['pre', 'original', 'post']);
						done();
					});
			});
			it('should throw an error if the method doesn\'t exist', function() {
				expect(function() {
					instance.addHooks('nonexistant');
				}).to.throw(/undeclared method/);
			});
			it('should create a method for a qualified hook', function(done) {
				instance.addHooks({'pre:method': original})
					.hook('pre:method', pre)
					.method(function() {
						expect(called).to.eql(['pre', 'original']);
						done();
					});
			});
			it('should call a callback passed to the method AFTER everything finishes', function(done) {
				instance.addHooks('test')
					.pre('test', pre)
					.post('test', post)
					.test(function() {
						expect(called).to.eql(['pre', 'original', 'post']);
						done();
					});
			})
		});
	});
	describe('lenient instance', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create({
				strict: false
			});
		});
		it('it should allow implicit hook registration', function() {
			var called = false;
			instance.pre('test', function() {
				called = true;
			}).callHook(PRE_TEST);
			expect(called).to.be.true();
		});
		it('it should allow all hooks', function() {
			expect(instance.hookable('pre:nonexistant')).to.be.true();
		});
	});
});

