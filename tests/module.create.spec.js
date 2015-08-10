'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('module.create', function() {
	before(function() {
		subject.set('grappling-hook:test:create', {strict: false, qualifiers: {pre: 'presetPre', post: 'presetPost'}});
	});
	after(function() {
		subject.set('grappling-hook:test:create', undefined);
	});

	it('should be a function', function() {
		expect(subject.create).to.be.a.function();
	});
	it('should return a grappling-hook object', function() {
		var instance = subject.create();
		expect($.isGrapplingHook(instance)).to.be.true();
	});
	it('should use presets if provided', function() {
		var instance = subject.create('grappling-hook:test:create');
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should use options if provided', function() {
		var instance = subject.create({strict: false});
		expect(instance.__grappling.opts.strict).to.be.false();
	});
	it('should override presets if options are provided', function() {
		var instance = subject.create('grappling-hook:test:create', {qualifiers: {pre: 'overriddenPre'}});
		expect(instance.__grappling.opts.qualifiers.pre).to.equal('overriddenPre');
	});

});
