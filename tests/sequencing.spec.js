"use strict";

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var sinon = require('sinon');
var $ = require('./fixtures');

describe('-- call sequence --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});

	describe('with mixed types', function() {
		var sequence,
			instance;

		beforeEach(function() {
			sequence = [];
			instance = subject.create();
			instance.allowHooks($.PRE_TEST);
		});
		it('should call sync/async/parallel middleware in a correct sequence', function(done) {
			var expected = [
				'A (parallel) setup',
				'B (sync) done',
				'C (parallel) setup',
				'D (parallel) setup',
				'E (serial) setup',
				'A (parallel) done',
				'C (parallel) done',
				'D (parallel) done',
				'E (serial) done',
				'F (serial) setup',
				'F (serial) done'
			];
			instance.pre('test',
				$.factories.createParallel('A', sequence),
				$.factories.createSync('B', sequence),
				$.factories.createParallel('C', sequence),
				$.factories.createParallel('D', sequence),
				$.factories.createSerial('E', sequence),
				$.factories.createSerial('F', sequence)
			);
			instance.callHook($.PRE_TEST, function() {
				expect($.factories.toRefString(sequence)).to.eql(expected);
				done();
			});
		});
	});
});
