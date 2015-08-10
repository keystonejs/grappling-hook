'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');

describe('module.get', function() {
	it('should be a function', function() {
		expect(subject.get).to.be.a.function();
	});
	it('should retrieve a full options object', function() {
		var presets = {strict: false, qualifiers: {pre: 'getsetPre', post: 'getsetPost'}};
		subject.set('grappling-hook:test:getset', {strict: false, qualifiers: {pre: 'getsetPre', post: 'getsetPost'}});
		expect(subject.get('grappling-hook:test:getset')).to.eql(presets);
	});
});

describe('module.set', function() {
	it('should be a function', function() {
		expect(subject.set).to.be.a.function();
	});
	it('should set presets', function() {
		subject.set('grappling-hook:test:getset.strict', false);
		expect(subject.get('grappling-hook:test:getset.strict')).to.be.false();
	});
});
