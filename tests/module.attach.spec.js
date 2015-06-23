'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

var Clazz = function() {
};

describe('module.attach', function() {
	it('should be a function', function() {
		expect(subject.attach).to.be.a.function();
	});
	it('should return the original class', function() {
		var ModifiedClazz = subject.attach(Clazz);
		expect(ModifiedClazz).to.equal(Clazz);
	});
	it('should add grappling-hook methods to the prototype', function() {
		var ModifiedClazz = subject.attach(Clazz),
			instance = new ModifiedClazz();
		expect(instance).to.be.an.instanceOf(Clazz);
		expect(instance).to.have.keys($.MEMBERS);
	});
	it('should make a functional prototype', function() {
		subject.attach(Clazz);
		var instance = new Clazz();
		var called = false;
		instance.allowHooks($.PRE_TEST)
			.hook($.PRE_TEST, function() {
				called = true;
			})
			.callHook($.PRE_TEST);
		expect(called).to.be.true();
	});
});
