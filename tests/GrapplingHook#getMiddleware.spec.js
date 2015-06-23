'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#getMiddleware', function() {
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
