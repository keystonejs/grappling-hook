'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#addThenableHooks', function() {
	describe('API', function() {

		var instance;
		var pre,
			original,
			post,
			called;
		beforeEach(function() {
			instance = subject.create({
				createThenable: function(fn) {
					return new P(fn);
				}
			});
			called = [];
			pre = function() {
				called.push('pre');
			};
			original = function(foo) {
				called.push('original');
				return P.resolve(foo);
			};
			post = function() {
				called.push('post');
			};
			instance.test = original;
		});
		it('should return the instance', function() {
			var actual = instance.addThenableHooks($.PRE_TEST);
			expect(actual).to.equal(instance);
		});
		it('should throw an error if the parameters are not a string or object', function() {
			expect(function() {
				instance.addThenableHooks(666);
			}).to.throw(/string|object/i);
		});
		it('should add a qualified hook to an existing method', function() {
			instance.addThenableHooks($.PRE_TEST)
				.hook($.PRE_TEST, pre)
				.test('foo');
			expect(called).to.eql(['pre', 'original']);
		});
		it('should add all qualified hooks to an existing method', function(done) {
			instance.addThenableHooks($.PRE_TEST, $.POST_TEST)
				.pre('test', pre)
				.post('test', post)
				.test('foo').then(function() {
					expect(called).to.eql(['pre', 'original', 'post']);
					done();
				});
		});
		it('should add pre and post for unqualified hooks to an existing method', function(done) {
			instance.addThenableHooks('test')
				.pre('test', pre)
				.post('test', post)
				.test('foo').then(function() {
					expect(called).to.eql(['pre', 'original', 'post']);
					done();
				});
		});
		it('should throw an error if the method doesn\'t exist', function() {
			expect(function() {
				instance.addThenableHooks('nonexistant');
			}).to.throw(/undeclared method/);
		});
		it('should create a method for a qualified hook', function(done) {
			instance.addThenableHooks({'pre:method': original})
				.hook('pre:method', pre)
				.method('foo').then(function() {
					expect(called).to.eql(['pre', 'original']);
					done();
				});
		});
		it('should allow passing a function as a parameter ', function(done) {
			var f = function() {
			};
			instance.test = function(fn) {
				return P.resolve(fn);
			};
			instance.addThenableHooks('test')
				.test(f).then(function(passed) {
					expect(passed).to.equal(f);
					done();
				});
		});
		it('should allow passing a value', function() {
			instance.test = function(foo) {
				return P.resolve(foo);
			};
			instance.addThenableHooks('test');
			instance.test('foo').then(function(actual) {
				expect(actual).to.equal('foo');
			});
		});
	});
	describe('sequencing', function() {
		var instance, sequence;
		beforeEach(function() {
			sequence = [];
			instance = subject.create({
				createThenable: function(fn) {
					return new P(fn);
				}
			});
			instance[$.TEST] = $.factories.createThenable('method', sequence);
			instance.addThenableHooks($.TEST);
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
				'method (thenable) setup',
				'method (thenable) done',
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
			).test().then(function() {
					expect($.factories.toRefString(sequence)).to.eql(expected);
					done();
				});
		});
	});
	describe('wrapped methods', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create({
				createThenable: function(fn) {
					return new P(fn);
				}
			});
		});

		it('should pass all parameters to async serial pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.pre('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.pre('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to thenable pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
					return P.resolve();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to sync pre middleware; #11', function() {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b);
			expect(passed).to.eql([a, b]);
		});
		it('should pass all parameters to sync post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.post('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async serial post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.post('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.post('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to thenable post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
				return P.resolve();
			};
			instance.addThenableHooks('test')
				.post('test', function(a, b) {
					passed = [a, b];
					return P.resolve();
				})
				.test(a, b).then(function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
	});
});
