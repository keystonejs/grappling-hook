'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

var Clazz = function() {
};

describe('module.attach', function() {
	before(function() {
		subject.set('grappling-hook:test:attach', {strict: false, qualifiers: {pre: 'presetPre', post: 'presetPost'}});
	});
	after(function() {
		subject.set('grappling-hook:test:attach', undefined);
	});
	it('should be a function', function() {
		expect(subject.attach).to.be.a.function();
	});
	it('should return the original class', function() {
		var ModifiedClazz = subject.attach(Clazz);
		expect(ModifiedClazz).to.equal(Clazz);
	});
	it('should add grappling-hook methods to the prototype of a function', function() {
		var ModifiedClazz = subject.attach(Clazz),
			instance = new ModifiedClazz();
		expect(instance).to.be.an.instanceOf(Clazz);
		expect($.isGrapplingHook(instance)).to.be.true();
	});
	it('should add grappling-hook methods to function.prototype', function() {
		var proto = subject.attach(Clazz.prototype),
			instance = new proto.constructor();
		expect(instance).to.be.an.instanceOf(Clazz);
		expect($.isGrapplingHook(instance)).to.be.true();
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
	it('should create instances with separate caches', function() {
		subject.attach(Clazz);
		var i1 = new Clazz();
		i1.allowHooks('pre:test1');
		var i2 = new Clazz();
		i2.allowHooks('pre:test2');
		expect(i1.hookable('pre:test2')).to.be.false();
		expect(i2.hookable('pre:test1')).to.be.false();
	});
	it('should use presets if provided', function() {
		subject.attach(Clazz, 'grappling-hook:test:attach');
		var instance = new Clazz();
		instance.hasMiddleware('pre:enforceInitialization'); // enforces lazy initialization
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should use options if provided', function() {
		subject.attach(Clazz, {strict: false});
		var instance = new Clazz();
		instance.hasMiddleware('pre:enforceInitialization'); // enforces lazy initialization
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should override presets if options are provided', function() {
		subject.attach(Clazz, 'grappling-hook:test:attach', {qualifiers: {pre: 'overriddenPre'}});
		var instance = new Clazz();
		instance.hasMiddleware('pre:enforceInitialization'); // enforces lazy initialization
		expect(instance.__grappling.opts.qualifiers.pre).to.equal('overriddenPre');
	});
});
