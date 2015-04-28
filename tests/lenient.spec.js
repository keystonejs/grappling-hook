'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');

describe('-- lenient mode --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});
	describe('`strict: false`', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create({
				strict: false
			});
		});
		it('it should allow implicit hook registration', function() {
			var called = false;
			instance.pre('test', function() {
				called = true;
			}).callHook($.PRE_TEST);
			expect(called).to.be.true();
		});
		it('it should allow all hooks', function() {
			expect(instance.hookable('pre:nonexistant')).to.be.true();
		});
	});
});
