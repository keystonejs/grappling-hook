'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var sinon = require('sinon');
var $ = require('./fixtures');

describe('-- API --', function() {
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
	describe('static members', function() {
		describe('.mixin', function() {
			it('should add grappling-hook functions to an existing object', function() {
				var instance = {};
				subject.mixin(instance);
				expect(instance).to.have.keys($.MEMBERS);
			});
		});
		describe('.create', function() {
			it('should return a grappling-hook object', function() {
				var instance = subject.create();
				expect(instance).to.have.keys($.MEMBERS);
			});
		});
		describe('.attach', function() {
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
				expect(instance).to.have.keys($.MEMBERS);
			});
			it('should make a functional prototype', function() {
				subject.attach(Clazz);
				var instance = new Clazz();
				var called = false;
				instance.allowHooks($.PRE_TEST)
					.hook($.PRE_TEST, function() {
						called = true;
					})
					.callHook($.PRE_TEST);
				expect(called).to.be.true();
			});
		});
	});
	describe('instance members', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create();
		});
		describe('#allowHooks', function() {
			var hook;
			beforeEach(function() {
				hook = sinon.spy();
			});
			it('should throw an error for anything other qualifiers but `pre` or `post`', function() {
				expect(function() {
					instance.allowHooks('nope:not valid!');
				}).to.throw(/pre|post/);
			});
			it('should throw an error for anything else but a valid hook', function() {
				expect(function() {
					instance.allowHooks(9);
				}).to.throw(/string/i);
			});
			it('should return the instance', function() {
				var actual = instance.allowHooks($.PRE_TEST);
				expect(actual).to.equal(instance);
			});
			it('should register a qualified hook', function() {
				instance.allowHooks($.PRE_TEST);
				instance.hook($.PRE_TEST, hook)
					.callHook($.PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept multiple qualified hooks', function() {
				instance.allowHooks($.POST_TEST, $.PRE_TEST)
					.hook($.PRE_TEST, hook)
					.callHook($.PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an array of qualified hooks', function() {
				instance.allowHooks([$.POST_TEST, $.PRE_TEST])
					.hook($.PRE_TEST, hook)
					.callHook($.PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an action and register both hooks', function() {
				instance.allowHooks('test')
					.hook($.PRE_TEST, hook)
					.hook($.POST_TEST, hook)
					.callHook($.PRE_TEST)
					.callHook($.POST_TEST);
				expect(hook.callCount).to.equal(2);
			});
		});
		describe('#hookable', function() {
			beforeEach(function() {
				instance.allowHooks($.PRE_TEST);
			});
			it('should return `true` if allowed', function() {
				expect(instance.hookable($.PRE_TEST)).to.be.true();
			});
			it('should return `false` if not allowed', function() {
				expect(instance.hookable($.POST_TEST)).to.be.false();
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
			it('should return the instance', function() {
				var actual = instance.hook($.PRE_TEST);
				expect(actual).to.equal(instance);
			});
			it('should register a single callback as middleware', function() {
				instance.hook($.PRE_TEST, callback)
					.callHook($.PRE_TEST)
					.callHook($.POST_TEST);
				expect(callback.callCount).to.equal(1);
			});
			it('should register multiple middleware', function() {
				instance.hook($.PRE_TEST, callback, callback, callback)
					.callHook($.PRE_TEST);
				expect(callback.callCount).to.equal(3);
			});
			it('should register an array of middleware', function() {
				var hooks = [callback, callback, callback];
				instance.hook($.PRE_TEST, hooks)
					.callHook($.PRE_TEST);
				expect(callback.callCount).to.equal(hooks.length);
			});
		});
		describe('#getMiddleware', function() {
			var callback;
			beforeEach(function() {
				callback = function() {
				};
				instance.allowHooks($.PRE_TEST);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.getMiddleware('test');
				}).to.throw(/qualified/);
			});
			it('should return empty array if no middleware registered for the hook', function() {
				var actual = instance.getMiddleware($.PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should return empty array if the hook does not exist', function() {
				var actual = instance.getMiddleware('pre:nonexistant');
				expect(actual).to.eql([]);
			});
			it('should retrieve all middleware for a hook', function() {
				var actual = instance.hook($.PRE_TEST, callback)
					.getMiddleware($.PRE_TEST);
				expect(actual).to.eql([callback]);
			});
		});
		describe('#hasMiddleware', function() {
			var callback;
			beforeEach(function() {
				callback = function() {
				};
				instance.allowHooks($.PRE_TEST);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.hasMiddleware('test');
				}).to.throw(/qualified/);
			});
			it('should return `false` if no middleware is registered for the hook', function() {
				var actual = instance.hasMiddleware($.PRE_TEST);
				expect(actual).to.be.false();
			});
			it('should return `true` if middleware is registered for the hook', function() {
				var actual = instance.hook($.PRE_TEST, callback)
					.hasMiddleware($.PRE_TEST);
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
					args: undefined
				};
				callback = function(foo, bar) {
					passed.args = [foo, bar];
					passed.scope = this;
				};
				instance.allowHooks('test')
					.hook($.PRE_TEST, callback);
			});
			it('should throw an error for an unqualified hook', function(done) {
				expect(function() {
					instance.callHook('test');
				}).to.throw(/qualified/);
				done();
			});
			it('should return the instance', function(done) {
				var actual = instance.callHook($.PRE_TEST, foo, bar, done);
				expect(actual).to.equal(instance);
			});
			it('should pass `...parameters` to middleware', function(done) {
				instance.callHook($.PRE_TEST, foo, bar, done);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass `parameters[]` to middleware', function(done) {
				instance.callHook($.PRE_TEST, [foo, bar], done);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass functions as parameters to middleware', function(done) {
				var f = function() {
				};
				instance.callHook($.PRE_TEST, [foo, f], done);
				expect(passed.args).to.eql([foo, f]);
			});
			it('should execute middleware in scope `context`', function(done) {
				var context = {};
				instance.callHook(context, $.PRE_TEST, [foo, bar], done);
				expect(passed.scope).to.equal(context);
			});
			it('should execute middleware in scope `instance` by default', function(done) {
				instance.callHook($.PRE_TEST, [foo, bar], done);
				expect(passed.scope).to.equal(instance);
			});
			//see sequencing.spec for callback handling in `callHook(hookName, callback)`
		});
		
		describe('#callSyncHook', function() {
			var callback,
				passed,
				foo = {},
				bar = {};
			beforeEach(function() {
				passed = {
					scope: undefined,
					args: undefined
				};
				callback = function(foo, bar) {
					passed.args = [foo, bar];
					passed.scope = this;
				};
				instance.allowHooks('test')
					.hook($.PRE_TEST, callback);
			});
			it('should throw an error for an unqualified hook', function() {
				expect(function() {
					instance.callSyncHook('test');
				}).to.throw(/qualified/);
			});
			it('should return the instance', function() {
				var actual = instance.callSyncHook($.PRE_TEST, foo, bar);
				expect(actual).to.equal(instance);
			});
			it('should pass `...parameters` to middleware', function() {
				instance.callSyncHook($.PRE_TEST, foo, bar);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass `parameters[]` to middleware', function() {
				instance.callSyncHook($.PRE_TEST, [foo, bar]);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass functions as parameters to middleware', function() {
				var f = function() {
				};
				instance.callSyncHook($.PRE_TEST, [foo, f]);
				expect(passed.args).to.eql([foo, f]);
			});
			it('should execute middleware in scope `context`', function() {
				var context = {};
				instance.callHook(context, $.PRE_TEST, [foo, bar]);
				expect(passed.scope).to.equal(context);
			});
			it('should execute middleware in scope `instance` by default', function() {
				instance.callHook($.PRE_TEST, [foo, bar]);
				expect(passed.scope).to.equal(instance);
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
			it('should return the instance', function() {
				var actual = instance.unhook($.PRE_TEST);
				expect(actual).to.equal(instance);
			});
			it('should remove specified middleware for a qualified hook', function() {
				instance.allowHooks($.PRE_TEST)
					.hook($.PRE_TEST, c1, c2)
					.unhook($.PRE_TEST, c1);
				var actual = instance.getMiddleware($.PRE_TEST);
				expect(actual).to.eql([c2]);
			});
			it('should remove all middleware for a qualified hook', function() {
				instance.allowHooks($.PRE_TEST)
					.hook($.PRE_TEST, c1, c2)
					.unhook($.PRE_TEST);
				var actual = instance.getMiddleware($.PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should remove all middleware for an unqualified hook', function() {
				instance.allowHooks('test')
					.hook($.PRE_TEST, c1, c2)
					.hook($.POST_TEST, c1, c2)
					.unhook('test');
				var actual = instance.getMiddleware($.PRE_TEST);
				expect(actual).to.eql([]);
			});
			it('should throw an error if middleware are specified for an unqualified hook', function() {
				instance.allowHooks($.PRE_TEST)
					.hook($.PRE_TEST, c1, c2);
				expect(function() {
					instance.unhook('test', c1);
				}).to.throw(/qualified/);
			});
			it('should remove all middleware ', function() {
				instance.allowHooks('test')
					.hook($.PRE_TEST, c1, c2)
					.hook($.POST_TEST, c1, c2)
					.unhook()
				;
				expect(instance.getMiddleware($.PRE_TEST)).to.eql([]);
				expect(instance.getMiddleware($.POST_TEST)).to.eql([]);
			});
			it('should not turn disallowed hooks into allowed hooks', function() {
				instance.allowHooks($.PRE_TEST)
					.unhook('test');
				expect(instance.hookable($.PRE_TEST)).to.be.true();
				expect(instance.hookable($.POST_TEST)).to.be.false();
			});
			it('should not disallow all hooks', function() {
				instance.allowHooks($.PRE_TEST)
					.unhook();
				expect(instance.hookable($.PRE_TEST)).to.be.true();
				expect(instance.hookable($.POST_TEST)).to.be.false();
			});
		});
		describe('#addHooks', function() {
			var pre,
				original,
				post,
				called;
			beforeEach(function() {
				called = [];
				pre = function pre() {
					called.push('pre');
				};
				original = function original(foo, done) {
					setTimeout(function() {
						called.push('original');
						done();
					}, 0);
				};
				post = function post() {
					called.push('post');
				};
				instance.test = original;
			});
			it('should return the instance', function() {
				var actual = instance.addHooks($.PRE_TEST);
				expect(actual).to.equal(instance);
			});
			it('should throw an error if the parameters are not a string or object', function() {
				expect(function() {
					instance.addHooks(666);
				}).to.throw(/string|object/i);
			});
			it('should add a qualified hook to an existing method', function(done) {
				instance.addHooks($.PRE_TEST)
					.hook($.PRE_TEST, pre)
					.test('foo', function final() {
						expect(called).to.eql(['pre', 'original']);
						done();
					});
			});
			it('should add all qualified hooks to an existing method', function(done) {
				instance.addHooks($.PRE_TEST, $.POST_TEST)
					.pre('test', pre)
					.post('test', post)
					.test('foo', function() {
						expect(called).to.eql(['pre', 'original', 'post']);
						done();
					});
			});
			it('should add pre and post for unqualified hooks to an existing method', function(done) {
				instance.addHooks('test')
					.pre('test', pre)
					.post('test', post)
					.test('foo', function() {
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
					.method('foo', function() {
						expect(called).to.eql(['pre', 'original']);
						done();
					});
			});
			it('should call a callback passed to the method AFTER everything finishes', function(done) {
				instance.addHooks('test')
					.pre('test', pre)
					.post('test', post)
					.test('foo', function() {
						expect(called).to.eql(['pre', 'original', 'post']);
						done();
					});
			});
			it('should allow passing a function as a parameter ', function(done){
				var passed;
				var f = function(){};
				instance.test = function(fn, done){
					passed = fn;
					done();
				};
				instance.addHooks('test')
					.test(f, function(){
						expect(passed).to.equal(f);
						done();
					});
			});
			it('should enforce passing a callback to the wrapped method', function(done){
				instance.test = function(done){
					done();
				};
				instance.addHooks('test');
				expect(function() {
					instance.test();
				}).to.throw(/callback/);
				done();
			});
		});
		describe('#addSyncHooks', function() {
			var pre,
				original,
				post,
				called;
			beforeEach(function() {
				called = [];
				pre = function() {
					called.push('pre');
				};
				original = function(foo) {
					called.push('original');
					return foo;
				};
				post = function() {
					called.push('post');
				};
				instance.test = original;
			});
			it('should return the instance', function() {
				var actual = instance.addSyncHooks($.PRE_TEST);
				expect(actual).to.equal(instance);
			});
			it('should throw an error if the parameters are not a string or object', function() {
				expect(function() {
					instance.addSyncHooks(666);
				}).to.throw(/string|object/i);
			});
			it('should add a qualified hook to an existing method', function() {
				instance.addSyncHooks($.PRE_TEST)
					.hook($.PRE_TEST, pre)
					.test('foo');
				expect(called).to.eql(['pre', 'original']);
			});
			it('should add all qualified hooks to an existing method', function() {
				instance.addSyncHooks($.PRE_TEST, $.POST_TEST)
					.pre('test', pre)
					.post('test', post)
					.test('foo');
				expect(called).to.eql(['pre', 'original', 'post']);
			});
			it('should add pre and post for unqualified hooks to an existing method', function() {
				instance.addSyncHooks('test')
					.pre('test', pre)
					.post('test', post)
					.test('foo');
				expect(called).to.eql(['pre', 'original', 'post']);
			});
			it('should throw an error if the method doesn\'t exist', function() {
				expect(function() {
					instance.addSyncHooks('nonexistant');
				}).to.throw(/undeclared method/);
			});
			it('should create a method for a qualified hook', function() {
				instance.addSyncHooks({'pre:method': original})
					.hook('pre:method', pre)
					.method('foo');
				expect(called).to.eql(['pre', 'original']);
			});
			it('should allow passing a function as a parameter ', function(){
				var passed;
				var f = function(){};
				instance.test = function(fn){
					passed = fn;
				};
				instance.addSyncHooks('test')
					.test(f);
				expect(passed).to.equal(f);
			});
			it('should allow returning a value', function(){
				instance.test = function(foo){
					return foo;
				};
				instance.addSyncHooks('test');
				var actual = instance.test('foo');
				expect(actual).to.equal('foo');
			});
		});
	});

});

