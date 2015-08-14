'use strict';
/* eslint-env node, mocha */

var _ = require('lodash');
var expect = require('must');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');

describe('GrapplingHook#callSyncHook', function() {
	describe('API', function() {

		var instance;
		var callback,
			passed,
			foo = {},
			bar = {};
		beforeEach(function() {
			instance = subject.create({
				createThenable: function(fn) {
					return new P(fn);
				}
			});
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
		it('should throw an error for an unqualified hook', function() {
			expect(function() {
				instance.callSyncHook('test');
			}).to.throw(/qualified/);
		});
		it('should return the instance', function() {
			var actual = instance.callSyncHook($.PRE_TEST, foo, bar);
			expect(actual).to.equal(instance);
		});
		it('should pass `...parameters` to middleware', function() {
			instance.callSyncHook($.PRE_TEST, foo, bar);
			expect(passed.args).to.eql([foo, bar]);
		});
		it('should pass `parameters[]` to middleware', function() {
			instance.callSyncHook($.PRE_TEST, [foo, bar]);
			expect(passed.args).to.eql([[foo, bar]]);
		});
		it('should pass first parameter to thenables', function(done) {
			instance
				.pre('test')
				.then(function(p) {
					expect(p).to.eql([foo, bar]);
					done();
				});
			instance.callSyncHook($.PRE_TEST, [foo, bar]);
		});
		it('should pass functions as parameters to middleware', function() {
			var f = function() {
			};
			instance.callSyncHook($.PRE_TEST, [foo, f]);
			expect(passed.args).to.eql([[foo, f]]);
		});
		it('should execute middleware in scope `context`', function() {
			var context = {};
			instance.callHook(context, $.PRE_TEST, [foo, bar]);
			expect(passed.scope).to.equal(context);
		});
		it('should execute middleware in scope `instance` by default', function() {
			instance.callHook($.PRE_TEST, [foo, bar]);
			expect(passed.scope).to.equal(instance);
		});
	});
	describe('sequencing', function() {
		var instance, sequence;
		beforeEach(function() {
			sequence = [];
			instance = subject.create();
			instance.allowHooks($.PRE_TEST);
		});

		it('should finish all middleware in a correct sequence', function() {
			var expected = [
				'A (sync) done',
				'B (sync) done',
				'C (sync) done'
			];
			instance.pre('test',
				$.factories.createSync('A', sequence),
				$.factories.createSync('B', sequence),
				$.factories.createSync('C', sequence)
			);
			instance.callSyncHook($.PRE_TEST);
			expect($.factories.toRefString(sequence)).to.eql(expected);
		});
	});
});
