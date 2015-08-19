'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');

describe('options: `createThenable`', function() {
	var instance;
	describe('default', function() {
		beforeEach(function() {
			instance = subject.create({
				strict: false
			});
		});
		it('it should throw an error when trying to use thenable hooks', function() {
			expect(function() {
				instance.callThenableHook('pre:test');
			}).to.throw(/createThenable/);
		});
	});
});
