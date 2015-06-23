'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#hookable', function() {
	var instance;
	beforeEach(function() {
		instance = subject.create();
		instance.allowHooks($.PRE_TEST);
	});
	it('should return `true` if allowed', function() {
		expect(instance.hookable($.PRE_TEST)).to.be.true();
	});
	it('should return `false` if not allowed', function() {
		expect(instance.hookable($.POST_TEST)).to.be.false();
	});
});
