'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var sinon = require('sinon');
var subject = require('../index');

describe('options: `qualifiers`', function() {
	var instance;
	var spy;
	beforeEach(function() {
		spy = sinon.spy();
		instance = subject.create({
			qualifiers: {
				pre: 'before',
				post: 'after'
			}
		});
	});
	it('should expose the qualifiers as functions', function() {
		expect(instance.before).to.be.a.function();
		expect(instance.after).to.be.a.function();
	});
	it('should not expose the default qualifiers as functions', function() {
		expect(instance.pre).to.be.undefined();
		expect(instance.post).to.be.undefined();
	});
	it('should still allow normal operation', function(done) {
		instance
			.addHooks({
				test: function(callback) {
					callback();
				}
			})
			.before('test', function() {
				spy();
			})
			.after('test', function() {
				spy();
			})
			.test(function() {
				expect(spy.callCount).to.equal(2);
				done();
			});
	});
});

