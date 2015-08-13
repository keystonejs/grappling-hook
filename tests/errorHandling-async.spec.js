'use strict';

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');

describe('async hooks: error handling', function() {
	function testErrorHandling(testdata) {
		it('should be passed to `callback`', function(done) {
			testdata.instance.callHook($.PRE_TEST, function(actual) {
				expect(actual).to.equal(testdata.error);
				done();
			});
		});
		it('should stop execution of other middleware', function(done) {
			var shouldNotBeCalled = true;
			testdata.instance
				.hook($.PRE_TEST, function() {
					shouldNotBeCalled = false;
				})
				.callHook($.PRE_TEST, function() {
					expect(shouldNotBeCalled).to.be.true();
					done();
				});
		});
	}

	require('./errorHandling-base')(subject, undefined, testErrorHandling);

	describe('an error passed to `done` by async parallel middleware function', function() {
		it('should be passed to `callback`', function(done) {
			var error = new Error();
			var instance = subject.create();
			instance
				.allowHooks('test')
				.hook($.PRE_TEST, function(next, done) {
					setTimeout(function() {
						done(error);
					}, 0);
				})
				.callHook($.PRE_TEST, function(actual) {
					expect(actual).to.equal(error);
					done();
				});
		});
	});

	describe('an error passed to `next` by an async serial middleware function', function() {
		it('should prohibit parallel middleware from calling the final callback (again)', function(done) {
			var parallelFinished = false;
			var error = new Error();
			var instance = subject.create();
			instance
				.allowHooks('test')
				.hook($.PRE_TEST, function(next, done) {
					setTimeout(function() {
						parallelFinished = true;
						done();
					}, 0);
					next();
				})
				.hook($.PRE_TEST, function(next) {
					next(error);
				})
				.callHook($.PRE_TEST, function() {
					expect(parallelFinished).to.be.false();
					//this doesn't look like it's testing what it should, but if this wasn't
					//functioning as it should `done` would be called twice -> mocha error
					done();
				});
		});
	});
});
