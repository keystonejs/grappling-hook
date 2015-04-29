'use strict';

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
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

		it('should finish all parallel middleware in a correct sequence', function(done) {
			var expected = [
				'A (parallel) setup',
				'B (parallel) setup',
				'C (parallel) setup',
				'A (parallel) done',
				'C (parallel) done',
				'B (parallel) done'
			];
			instance.pre('test',
				$.factories.createParallel('A', sequence, 0),
				$.factories.createParallel('B', sequence, 200),
				$.factories.createParallel('C', sequence, 100)
			);
			instance.callHook($.PRE_TEST, function() {
				expect($.factories.toRefString(sequence)).to.eql(expected);
				done();
			});

		});

		it('should finish flipped parallel middleware in a correct sequence', function(done) {
			function flippedParallel(next, done) {
				setTimeout(function() {
					sequence.push(new $.factories.Ref({
						name: 'A',
						type: 'parallel',
						phase: 'done'
					}));
					done();
				}, 0);
				setTimeout(function() {
					sequence.push(new $.factories.Ref({
						name: 'A',
						type: 'parallel',
						phase: 'setup'
					}));
					next();
				}, 100);
			}
			
			var expected = [
				'A (parallel) done',
				'A (parallel) setup',
				'B (parallel) setup',
				'B (parallel) done'
			];
		
			instance.pre('test',
				flippedParallel,
				$.factories.createParallel('B', sequence)
			).callHook($.PRE_TEST, function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});
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
