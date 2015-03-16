'use strict';
/* global describe, it, beforeEach */
/* jshint unused:false */

var expect = require('must');
var subject = require('./index');
var sinon = require('sinon');

var MEMBERS = ['pre', 'post', 'hookup', 'hooks', 'hookable', 'unhook', 'emit', 'hooked', '__hooks'];
var PRE_TEST = 'pre:test';
var POST_TEST = 'post:test';

describe('-- prepost --', function() {
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
	});
	describe('#mixin', function() {
		it('should add prepost functions to an existing object', function() {
			var instance = {};
			subject.mixin(instance);
			expect(instance).to.have.keys(MEMBERS);
		});
	});
	describe('#create', function() {
		it('should return a prepost object', function() {
			var instance = subject.create();
			expect(instance).to.have.keys(MEMBERS);
		});
	});
	describe('instance', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create();
		});
		describe('#hookable', function() {
			var hook;
			beforeEach(function() {
				hook = sinon.spy();
			});
			it('should throw an error for anything else but `pre` or `post`', function() {
				expect(function() {
					instance.hookable('nope:not valid!');
				}).to.throw(/pre|post/);
			});
			it('should register a type:event hook', function() {
				instance.hookable(PRE_TEST)
					.hookup(PRE_TEST, hook)
					.emit(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept multiple type:event hooks', function() {
				instance.hookable(POST_TEST, PRE_TEST)
					.hookup(PRE_TEST, hook)
					.emit(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an array of type:event hooks', function() {
				instance.hookable([POST_TEST, PRE_TEST])
					.hookup(PRE_TEST, hook)
					.emit(PRE_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should accept an non-typed string and register both hooks', function() {
				instance.hookable('test')
					.hookup(PRE_TEST, hook)
					.hookup(POST_TEST, hook)
					.emit(PRE_TEST)
					.emit(POST_TEST);
				expect(hook.callCount).to.equal(2);
			});
		});
		describe('#hookup', function() {
			var hook;
			beforeEach(function() {
				hook = sinon.spy();
				instance.hookable('test');
			});
			it('should register a hook to a single event', function() {
				instance.hookup(PRE_TEST, hook)
					.emit(PRE_TEST)
					.emit(POST_TEST);
				expect(hook.callCount).to.equal(1);
			});
			it('should register multiple hooks', function() {
				instance.hookup(PRE_TEST, hook, hook, hook)
					.emit(PRE_TEST);
				expect(hook.callCount).to.equal(3);
			});
			it('should register an array of hooks to a single event', function() {
				var hooks = [hook, hook, hook];
				instance.hookup(PRE_TEST, hooks)
					.emit(PRE_TEST);
				expect(hook.callCount).to.equal(hooks.length);
			});
		});
		describe('#hooks', function() {
			var hook;
			beforeEach(function() {
				hook = sinon.spy();
				instance.hookable('test');
			});
			it('should iterate over all hooks and pass them to `iteratee`', function(done) {
				instance.hookup(PRE_TEST, hook, hook, hook);
				var stub = sinon.stub();
				stub.callsArgAsync(1); // calls `next`
				instance.hooks(PRE_TEST, stub, function() {
					expect(stub.callCount).to.equal(3);
					expect(stub.alwaysCalledWith(hook)); //`hook` is first argument
					done();
				});
			});
			it('should execute `iteratee` in scope `context`', function() {
				instance.hookup(PRE_TEST, hook);
				var context = {};
				instance.hooks(context, PRE_TEST, function(hook, next) {
					expect(this).to.equal(context);
					next();
				});
			});
		});
		describe('#emit', function() {
			var hook,
				passed,
				foo = {},
				bar = {};
			beforeEach(function() {
				passed = {
					scope: undefined,
					args : undefined,
					async: false
				};
				hook = function(foo,
								bar,
								next) {
					passed.args = [foo, bar];
					passed.scope = this;
					setTimeout(function() {
						passed.async = true;
						next();
					}, 0);
				};
				instance.hookable('test');
				instance.hookup(PRE_TEST, hook);
			});
			it('should pass `...parameters` to hooks', function() {
				instance.emit(PRE_TEST, foo, bar);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('should pass `parameters[]` to hooks', function() {
				instance.emit(PRE_TEST, [foo, bar]);
				expect(passed.args).to.eql([foo, bar]);
			});
			it('execute hooks in scope `context`', function() {
				instance.hookup(PRE_TEST, hook);
				var context = {};
				instance.emit(context, PRE_TEST, [foo, bar]);
				expect(passed.scope).to.equal(context);
			});
			it('should call `callback` when all hooks have been called', function(done) {
				instance.emit(PRE_TEST, [foo, bar], function() {
					expect(passed.async).to.be.true();
					done();
				});
			});
		});
	});
});

