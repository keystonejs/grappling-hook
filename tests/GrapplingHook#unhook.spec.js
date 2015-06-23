'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#unhook', function() {
	var c1, c2;
	var instance;
	beforeEach(function() {
		instance = subject.create();
		c1 = function() {
		};
		c2 = function() {
		};
	});
	it('should return the instance', function() {
		var actual = instance.unhook($.PRE_TEST);
		expect(actual).to.equal(instance);
	});
	it('should remove specified middleware for a qualified hook', function() {
		instance.allowHooks($.PRE_TEST)
			.hook($.PRE_TEST, c1, c2)
			.unhook($.PRE_TEST, c1);
		var actual = instance.getMiddleware($.PRE_TEST);
		expect(actual).to.eql([c2]);
	});
	it('should remove all middleware for a qualified hook', function() {
		instance.allowHooks($.PRE_TEST)
			.hook($.PRE_TEST, c1, c2)
			.unhook($.PRE_TEST);
		var actual = instance.getMiddleware($.PRE_TEST);
		expect(actual).to.eql([]);
	});
	it('should remove all middleware for an unqualified hook', function() {
		instance.allowHooks('test')
			.hook($.PRE_TEST, c1, c2)
			.hook($.POST_TEST, c1, c2)
			.unhook('test');
		var actual = instance.getMiddleware($.PRE_TEST);
		expect(actual).to.eql([]);
	});
	it('should throw an error if middleware are specified for an unqualified hook', function() {
		instance.allowHooks($.PRE_TEST)
			.hook($.PRE_TEST, c1, c2);
		expect(function() {
			instance.unhook('test', c1);
		}).to.throw(/qualified/);
	});
	it('should remove all middleware ', function() {
		instance.allowHooks('test')
			.hook($.PRE_TEST, c1, c2)
			.hook($.POST_TEST, c1, c2)
			.unhook()
		;
		expect(instance.getMiddleware($.PRE_TEST)).to.eql([]);
		expect(instance.getMiddleware($.POST_TEST)).to.eql([]);
	});
	it('should not turn disallowed hooks into allowed hooks', function() {
		instance.allowHooks($.PRE_TEST)
			.unhook('test');
		expect(instance.hookable($.PRE_TEST)).to.be.true();
		expect(instance.hookable($.POST_TEST)).to.be.false();
	});
	it('should not disallow all hooks', function() {
		instance.allowHooks($.PRE_TEST)
			.unhook();
		expect(instance.hookable($.PRE_TEST)).to.be.true();
		expect(instance.hookable($.POST_TEST)).to.be.false();
	});
});
