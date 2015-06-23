'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#hasMiddleware', function() {
	var instance;
	var callback;
	beforeEach(function() {
		callback = function() {
		};
		instance = subject.create();
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

