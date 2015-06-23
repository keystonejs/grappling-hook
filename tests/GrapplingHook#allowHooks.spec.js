'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var sinon = require('sinon');
var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#allowHooks', function() {
	var instance;
	var hook;
	beforeEach(function() {
		hook = sinon.spy();
		instance = subject.create();
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
