'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var sinon = require('sinon');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');

var NOOP = function(){};

describe('GrapplingHook#hook', function() {
	var instance;
	var callback;
	beforeEach(function() {
		callback = sinon.spy();
		instance = subject.create({
			createThenable: function(fn) {
				return new P(fn);
			}
		});
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
	it('should return the instance when a callback is provided', function() {
		var actual = instance.hook($.PRE_TEST, NOOP);
		expect(actual).to.equal(instance);
	});
	it('should return a thenable when a callback is not provided', function() {
		var actual = instance.hook($.PRE_TEST);
		expect(subject.isThenable(actual)).to.be.true();
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
