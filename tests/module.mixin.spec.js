'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('module.mixin', function() {

	before(function() {
		subject.set('grappling-hook:test:mixin', {strict: false, qualifiers: {pre: 'presetPre', post: 'presetPost'}});
	});
	after(function() {
		subject.set('grappling-hook:test:mixin', undefined);
	});
	it('should be a function', function() {
		expect(subject.mixin).to.be.a.function();
	});
	it('should add grappling-hook functions to an existing object', function() {
		var instance = {};
		subject.mixin(instance);
		expect($.isGrapplingHook(instance)).to.be.true();
	});
	it('should use presets if provided', function() {
		var instance = {};
		subject.mixin(instance, 'grappling-hook:test:mixin');
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should use options if provided', function() {
		var instance = {};
		subject.mixin(instance, {strict: false});
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should override presets if options are provided', function() {
		var instance = {};
		subject.mixin(instance, 'grappling-hook:test:mixin', {qualifiers: {pre: 'overriddenPre'}});
		expect(instance.__grappling.opts.qualifiers.pre).to.equal('overriddenPre');
	});
});
