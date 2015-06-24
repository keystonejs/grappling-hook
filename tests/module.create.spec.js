'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('module.create', function() {
	it('should be a function', function() {
		expect(subject.create).to.be.a.function();
	});
	it('should return a grappling-hook object', function() {
		var instance = subject.create();
		expect($.isGrapplingHook(instance)).to.be.true();
	});
});
