'use strict';
/* eslint-env node, mocha */

var _ = require('lodash');
var expect = require('must');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');

subject.set('grappling-hook:tests:callThenableHook', {
	createThenable: function(fn) {
		return new P(fn);
	}
});
describe('GrapplingHook#callThenableHook', function() {
	describe('API', function() {
		var callback,
			passed,
			foo = {},
			bar = {};
		var instance;
		beforeEach(function() {
			instance = subject.create('grappling-hook:tests:callThenableHook');
			passed = {
				scope: undefined,
				args: undefined
			};
			callback = function() {
				passed.args = _.toArray(arguments);
				passed.scope = this;
			};
			instance.allowHooks('test')
				.hook($.PRE_TEST, callback);
		});
		it('should throw an error for an unqualified hook', function(done) {
			expect(function() {
				instance.callThenableHook('test');
			}).to.throw(/qualified/);
			done();
		});
		it('should return a thenable', function() {
			var actual = instance.callThenableHook($.PRE_TEST, foo, bar);
			expect(actual.then).to.be.a.function();
		});
		it('should pass `...parameters` to middleware', function() {
			instance.callThenableHook($.PRE_TEST, foo, bar);
			expect(passed.args).to.eql([foo, bar]);
		});
		it('should pass `parameters[]` to middleware', function() {
			instance.callThenableHook($.PRE_TEST, [foo, bar]);
			expect(passed.args).to.eql([[foo, bar]]);
		});
		it('should pass first parameter to thenables', function(done) {
			instance
				.pre('test')
				.then(function(p) {
					expect(p).to.eql([foo, bar]);
					done();
				});
			instance.callThenableHook($.PRE_TEST, [foo, bar]);
		});
		it('should pass functions as parameters to middleware', function() {
			var f = function() {
			};
			instance.callThenableHook($.PRE_TEST, [foo, f]);
			expect(passed.args).to.eql([[foo, f]]);
		});
		it('should execute middleware in scope `context`', function() {
			var context = {};
			instance.callThenableHook(context, $.PRE_TEST, [foo, bar]);
			expect(passed.scope).to.equal(context);
		});
		it('should execute middleware in scope `instance` by default', function() {
			instance.callThenableHook($.PRE_TEST, [foo, bar]);
			expect(passed.scope).to.equal(instance);
		});
	});
	describe('sequencing', function() {
		var sequence,
			instance;
		beforeEach(function() {
			sequence = [];
			instance = subject.create('grappling-hook:tests:callThenableHook');
			instance.allowHooks($.PRE_TEST);
		});

		it('should finish all serial middleware in a correct sequence', function(done) {
			var expected = [
				'A (serial) setup',
				'A (serial) done',
				'B (serial) setup',
				'B (serial) done',
				'C (serial) setup',
				'C (serial) done'
			];
			instance.pre('test',
				$.factories.createSerial('A', sequence),
				$.factories.createSerial('B', sequence),
				$.factories.createSerial('C', sequence)
			);
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});

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
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});

		});

		it('should finish all thenable middleware in a correct sequence', function(done) {
			var expected = [
				'A (thenable) setup',
				'A (thenable) done',
				'B (thenable) setup',
				'B (thenable) done',
				'C (thenable) setup',
				'C (thenable) done'
			];
			instance.pre('test',
				$.factories.createThenable('A', sequence),
				$.factories.createThenable('B', sequence),
				$.factories.createThenable('C', sequence)
			);
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});

		});

		it('should finish "flipped" parallel middleware in a correct sequence', function(done) {
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

			instance
				.pre('test', flippedParallel, $.factories.createParallel('B', sequence))
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});
		});

		it('should call mixed middleware in a correct sequence', function(done) {
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
				'G (thenable) setup',
				'G (thenable) done',
				'F (serial) setup',
				'F (serial) done'
			];
			instance.pre('test',
				$.factories.createParallel('A', sequence),
				$.factories.createSync('B', sequence),
				$.factories.createParallel('C', sequence),
				$.factories.createParallel('D', sequence),
				$.factories.createSerial('E', sequence),
				$.factories.createThenable('G', sequence),
				$.factories.createSerial('F', sequence)
			);
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});
		});
	});
	describe('synchronicity', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create('grappling-hook:tests:callThenableHook');
			instance.allowHooks($.PRE_TEST);
		});
		it('should finish async even with sync middleware', function(done) {
			var isAsync = false;
			instance
				.hook($.PRE_TEST, function() {
				})
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true();
					done();
				});
			isAsync = true;
		});
		it('should finish async even with sync serial middleware', function(done) {
			var isAsync = false;
			instance
				.hook($.PRE_TEST, function(next) {
					next();
				})
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true();
					done();
				});
			isAsync = true;
		});
		it('should finish async even with sync parallel middleware', function(done) {
			var isAsync = false;
			instance
				.hook($.PRE_TEST, function(next, done) {
					next();
					done();
				})
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true();
					done();
				});
			isAsync = true;
		});
		it('should finish async even with resolved thenable middleware', function(done) {

			var promise = new P(function(resolve) {
				resolve();
			});
			var isAsync = false;
			instance
				.hook($.PRE_TEST, function() {
					return promise;
				})
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true();
					done();
				});
			isAsync = true;
		});
		it('should call the next middleware sync with sync serial middleware', function(done) {
			var isAsync;
			instance.hook($.PRE_TEST,
				function(next) {
					isAsync = false;
					next();
					isAsync = true;
				}, function() {
					expect(isAsync).to.be.false();
				});
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true(); // just making sure it's dezalgofied
					done();
				});
		});

		it('should call the next middleware sync with sync parallel middleware', function(done) {
			var isAsync;
			instance.hook($.PRE_TEST,
				function(next, done) {
					isAsync = false;
					next();
					isAsync = true;
					done();
				}, function() {
					expect(isAsync).to.be.false();
				});
			instance
				.callThenableHook($.PRE_TEST)
				.then(function() {
					expect(isAsync).to.be.true(); // just making sure it's dezalgofied
					done();
				});
		});

	});
});
