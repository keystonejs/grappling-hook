'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('module.mixin', function() {
	it('should be a function', function() {
		expect(subject.mixin).to.be.a.function();
	});
	it('should add grappling-hook functions to an existing object', function() {
		var instance = {};
		subject.mixin(instance);
		expect($.isGrapplingHook(instance)).to.be.true();
	});
});
