'use strict';
/* eslint-env node, mocha */

var expect = require('must');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#addSyncHooks', function() {
	describe('API', function() {

		var instance;
		var pre,
			original,
			post,
			called;
		beforeEach(function() {
			instance = subject.create();
			called = [];
			pre = function() {
				called.push('pre');
			};
			original = function(foo) {
				called.push('original');
				return foo;
			};
			post = function() {
				called.push('post');
			};
			instance.test = original;
		});
		it('should return the instance', function() {
			var actual = instance.addSyncHooks($.PRE_TEST);
			expect(actual).to.equal(instance);
		});
		it('should throw an error if the parameters are not a string or object', function() {
			expect(function() {
				instance.addSyncHooks(666);
			}).to.throw(/string|object/i);
		});
		it('should add a qualified hook to an existing method', function() {
			instance.addSyncHooks($.PRE_TEST)
				.hook($.PRE_TEST, pre)
				.test('foo');
			expect(called).to.eql(['pre', 'original']);
		});
		it('should add all qualified hooks to an existing method', function() {
			instance.addSyncHooks($.PRE_TEST, $.POST_TEST)
				.pre('test', pre)
				.post('test', post)
				.test('foo');
			expect(called).to.eql(['pre', 'original', 'post']);
		});
		it('should add pre and post for unqualified hooks to an existing method', function() {
			instance.addSyncHooks('test')
				.pre('test', pre)
				.post('test', post)
				.test('foo');
			expect(called).to.eql(['pre', 'original', 'post']);
		});
		it('should throw an error if the method doesn\'t exist', function() {
			expect(function() {
				instance.addSyncHooks('nonexistant');
			}).to.throw(/undeclared method/);
		});
		it('should create a method for a qualified hook', function() {
			instance.addSyncHooks({'pre:method': original})
				.hook('pre:method', pre)
				.method('foo');
			expect(called).to.eql(['pre', 'original']);
		});
		it('should allow passing a function as a parameter ', function() {
			var passed;
			var f = function() {
			};
			instance.test = function(fn) {
				passed = fn;
			};
			instance.addSyncHooks('test')
				.test(f);
			expect(passed).to.equal(f);
		});
		it('should allow returning a value', function() {
			instance.test = function(foo) {
				return foo;
			};
			instance.addSyncHooks('test');
			var actual = instance.test('foo');
			expect(actual).to.equal('foo');
		});
	});
	describe('sequencing', function() {
		var instance, sequence;
		beforeEach(function() {
			sequence = [];
			instance = subject.create();
			instance[$.TEST] = $.factories.createSync('method', sequence);
			instance.addSyncHooks($.TEST);
		});
		it('should finish all middleware in a correct sequence', function() {
			var expected = [
				'A (sync) done',
				'B (sync) done',
				'C (sync) done',
				'method (sync) done',
				'D (sync) done',
				'E (sync) done'
			];
			instance.pre('test',
				$.factories.createSync('A', sequence),
				$.factories.createSync('B', sequence),
				$.factories.createSync('C', sequence)
			).post('test',
				$.factories.createSync('D', sequence),
				$.factories.createSync('E', sequence)
			);
			instance.test();
			expect($.factories.toRefString(sequence)).to.eql(expected);
		});
	});
	describe('wrapped methods', function() {
		var instance;
		beforeEach(function() {
			instance = subject.create();
		});

		it('should pass all parameters to sync pre middleware; #11', function() {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
			};
			instance.addSyncHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b);
			expect(passed).to.eql([a, b]);
		});
		it('should pass all parameters to sync post middleware; #11', function() {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function() {
			};
			instance.addSyncHooks('test')
				.post('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b);
			expect(passed).to.eql([a, b]);
		});
	});

});
