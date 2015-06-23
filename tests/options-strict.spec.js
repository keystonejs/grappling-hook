'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('options: `strict`', function() {
	var instance;
	describe('default', function() {
		beforeEach(function() {
			instance = subject.create();
		});
		it('it should not allow implicit hook registration', function() {
			expect(function() {
				instance.pre('test', function() {
				});
			}).to.throw();
		});
		it('it should not allow all hooks', function() {
			expect(instance.hookable('pre:nonexistant')).to.be.false();
		});
	});
	describe('set to `false`', function() {
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
