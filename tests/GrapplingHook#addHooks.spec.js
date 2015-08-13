'use strict';

/* eslint-env node, mocha */

var _ = require('lodash');
var expect = require('must');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#addHooks', function() {
	describe('API', function() {

		var instance;
		var pre,
			original,
			post,
			called;
		beforeEach(function() {
			instance = subject.create();
			called = [];
			pre = function pre() {
				called.push('pre');
			};
			original = function original(foo, done) {
				setTimeout(function() {
					called.push('original');
					done();
				}, 0);
			};
			post = function post() {
				called.push('post');
			};
			instance.test = original;
		});
		it('should return the instance', function() {
			var actual = instance.addHooks($.PRE_TEST);
			expect(actual).to.equal(instance);
		});
		it('should throw an error if the parameters are not a string or object', function() {
			expect(function() {
				instance.addHooks(666);
			}).to.throw(/string|object/i);
		});
		it('should add a qualified hook to an existing method', function(done) {
			instance.addHooks($.PRE_TEST)
				.hook($.PRE_TEST, pre)
				.test('foo', function final() {
					expect(called).to.eql(['pre', 'original']);
					done();
				});
		});
		it('should add all qualified hooks to an existing method', function(done) {
			instance.addHooks($.PRE_TEST, $.POST_TEST)
				.pre('test', pre)
				.post('test', post)
				.test('foo', function() {
					expect(called).to.eql(['pre', 'original', 'post']);
					done();
				});
		});
		it('should add pre and post for unqualified hooks to an existing method', function(done) {
			instance.addHooks('test')
				.pre('test', pre)
				.post('test', post)
				.test('foo', function() {
					expect(called).to.eql(['pre', 'original', 'post']);
					done();
				});
		});
		it('should throw an error if the method doesn\'t exist', function() {
			expect(function() {
				instance.addHooks('nonexistant');
			}).to.throw(/undeclared method/);
		});
		it('should create a method for a qualified hook', function(done) {
			instance.addHooks({'pre:method': original})
				.hook('pre:method', pre)
				.method('foo', function() {
					expect(called).to.eql(['pre', 'original']);
					done();
				});
		});
		it('should call a callback passed to the method AFTER everything finishes', function(done) {
			instance.addHooks('test')
				.pre('test', pre)
				.post('test', post)
				.test('foo', function() {
					expect(called).to.eql(['pre', 'original', 'post']);
					done();
				});
		});
		it('should allow passing a function as a parameter ', function(done) {
			var passed;
			var f = function() {
			};
			instance.test = function(fn, done) {
				passed = fn;
				done();
			};
			instance.addHooks('test')
				.test(f, function() {
					expect(passed).to.equal(f);
					done();
				});
		});
		it('should enforce passing a callback to the wrapped method', function(done) {
			instance.test = function(done) {
				done();
			};
			instance.addHooks('test');
			expect(function() {
				instance.test();
			}).to.throw(/callback/);
			done();
		});
	});
	describe('wrapped methods', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create();
		});

		it('should pass all parameters to async serial pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to sync pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to thenable pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
					return P.resolve();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async serial post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to sync post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to thenable post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
					return P.resolve();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should allow passing values to the final callback', function(done) {
			var a = 1;
			var b = 'b';
			instance.test = function(done) {
				done(null, a, b);
			};
			instance.addHooks('test')
				.test(function() {
					var args = _.toArray(arguments);
					args.shift();
					expect(args).to.eql([a, b]);
					done();
				});
		});
	});
	describe('sequencing', function() {
		var sequence, instance;
		beforeEach(function() {
			sequence = [];
			instance = subject.create();
			instance[$.TEST] = $.factories.createSerial('method', sequence);
			instance.addHooks($.TEST);
		});
		it('should finish all middleware in a correct sequence', function(done) {
			var expected = [
				'A (parallel) setup',
				'B (sync) done',
				'C (parallel) setup',
				'D (serial) setup',
				'D (serial) done',
				'I (thenable) setup',
				'I (thenable) done',
				'C (parallel) done',
				'A (parallel) done',
				'method (serial) setup',
				'method (serial) done',
				'E (parallel) setup',
				'J (thenable) setup',
				'J (thenable) done',
				'F (sync) done',
				'G (serial) setup',
				'G (serial) done',
				'H (parallel) setup',
				'H (parallel) done',
				'E (parallel) done'
			];
			instance.pre('test',
				$.factories.createParallel('A', sequence, 100),
				$.factories.createSync('B', sequence),
				$.factories.createParallel('C', sequence, 50),
				$.factories.createSerial('D', sequence),
				$.factories.createThenable('I', sequence)
			).post('test',
				$.factories.createParallel('E', sequence, 100),
				$.factories.createThenable('J', sequence),
				$.factories.createSync('F', sequence),
				$.factories.createSerial('G', sequence),
				$.factories.createParallel('H', sequence, 50)
			).test(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});

		});
	});
});
