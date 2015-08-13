'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');
var P = require('bluebird');

subject.set('tests:errorHandling-thenables', {
	createThenable: function(fn) {
		return new P(fn);
	}
});

describe('thenable hooks: error handling', function() {
	describe('callThenableHook', function() {
		function testErrorHandling(testdata) {
			it('should fail the final promise', function(done) {
				testdata.instance.callThenableHook($.PRE_TEST)
					.catch(function(actual) {
						expect(actual).to.eql(testdata.error);
						done();
					});
			});
			it('should stop execution of other middleware', function(done) {
				var shouldNotBeCalled = true;
				testdata.instance.hook($.PRE_TEST, function() {
					shouldNotBeCalled = false;
				})
					.callThenableHook($.PRE_TEST)
					.catch(function() {
						expect(shouldNotBeCalled).to.be.true();
						done();
					});
			});
		}

		require('./errorHandling-base')(subject, 'tests:errorHandling-thenables', testErrorHandling);

		describe('an error passed to `done` by async parallel middleware function', function() {
			it('should be passed to `callback`', function(done) {
				var error = new Error();
				var instance = subject.create('tests:errorHandling-thenables');
				instance
					.allowHooks('test')
					.hook($.PRE_TEST, function(next, done) {
						setTimeout(function() {
							done(error);
						}, 50);
					})
					.callThenableHook($.PRE_TEST)
					.catch(function(actual) {
						expect(actual).to.equal(error);
						done();
					});
			});
		});

		describe('an error passed to `next` by an async serial middleware function', function() {
			it('should prohibit parallel middleware from calling the final callback (again)', function(done) {
				var parallelFinished = false;
				var error = new Error();
				var instance = subject.create('tests:errorHandling-thenables');
				instance
					.allowHooks('test')
					.hook($.PRE_TEST, function(next, done) {
						setTimeout(function() {
							parallelFinished = true;
							done();
						}, 50);
						next();
					})
					.hook($.PRE_TEST, function(next) {
						next(error);
					})
					.callThenableHook($.PRE_TEST).catch(function() {
						expect(parallelFinished).to.be.false();
						//this doesn't look like it's testing what it should, but if this wasn't
						//functioning as it should `done` would be called twice -> mocha error
						done();
					});
			});
		});
	});
	describe('wrapped methods', function() {
		function testErrorHandling(testdata) {
			beforeEach(function() {
				testdata.instance.addThenableHooks({
					test: function() {
						return P.resolve();
					}
				});
			});
			it('should fail the final promise', function(done) {
				testdata.instance.test()
					.catch(function(actual) {
						expect(actual).to.eql(testdata.error);
						done();
					});
			});
			it('should stop execution of other middleware', function(done) {
				var shouldNotBeCalled = true;
				testdata.instance.hook($.PRE_TEST, function() {
					shouldNotBeCalled = false;
				})
					.test()
					.catch(function() {
						expect(shouldNotBeCalled).to.be.true();
						done();
					});
			});
		}

		require('./errorHandling-base')(subject, 'tests:errorHandling-thenables', testErrorHandling);

		describe('an error passed to `done` by async parallel middleware function', function() {
			it('should be passed to `callback`', function(done) {
				var error = new Error();
				var instance = subject.create('tests:errorHandling-thenables');
				instance
					.addThenableHooks({
						test: function() {
							return P.resolve();
						}
					})
					.hook($.PRE_TEST, function(next, done) {
						setTimeout(function() {
							done(error);
						}, 50);
					})
					.test()
					.catch(function(actual) {
						expect(actual).to.equal(error);
						done();
					});
			});
		});

		describe('an error passed to `next` by an async serial middleware function', function() {
			it('should prohibit parallel middleware from calling the final callback (again)', function(done) {
				var parallelFinished = false;
				var error = new Error();
				var instance = subject.create('tests:errorHandling-thenables');
				instance
					.addThenableHooks({
						test: function() {
							return P.resolve();
						}
					})
					.hook($.PRE_TEST, function(next, done) {
						setTimeout(function() {
							parallelFinished = true;
							done();
						}, 50);
						next();
					})
					.hook($.PRE_TEST, function(next) {
						next(error);
					})
					.test()
					.catch(function() {
						expect(parallelFinished).to.be.false();
						//this doesn't look like it's testing what it should, but if this wasn't
						//functioning as it should `done` would be called twice -> mocha error
						done();
					});
			});
		});

	});
});
