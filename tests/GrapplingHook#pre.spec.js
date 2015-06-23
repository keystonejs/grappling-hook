'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var sinon = require('sinon');
var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#pre', function() {
	var instance;
	var callback;
	beforeEach(function() {
		callback = sinon.spy();
		instance = subject.create();
		instance.allowHooks($.PRE_TEST);
	});
	it('should throw an error for a non-existing hook', function() {
		expect(function() {
			instance.pre('notAllowed');
		}).to.throw(/not supported/);
	});
	it('should return the instance', function() {
		var actual = instance.pre($.TEST);
		expect(actual).to.equal(instance);
	});
	it('should register a single callback as middleware', function() {
		instance.pre($.TEST, callback)
			.callHook($.PRE_TEST);
		expect(callback.callCount).to.equal(1);
	});
	it('should register multiple middleware', function() {
		instance.pre($.TEST, callback, callback, callback)
			.callHook($.PRE_TEST);
		expect(callback.callCount).to.equal(3);
	});
	it('should register an array of middleware', function() {
		var hooks = [callback, callback, callback];
		instance.pre($.TEST, hooks)
			.callHook($.PRE_TEST);
		expect(callback.callCount).to.equal(hooks.length);
	});
});
