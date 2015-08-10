'use strict';

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');
var P = require('bluebird');

describe('async hooks: error handling', function() {
	var instance;
	var error;
	beforeEach(function() {
		error = new Error('middleware error');
		instance = subject.create();
		instance.allowHooks($.PRE_TEST);
	});

	function testErrorHandling() {
		it('should be passed to `callback`', function(done) {
			instance.callHook($.PRE_TEST, function(actual) {
				expect(actual).to.equal(error);
				done();
			});
		});
		it('should stop execution of other middleware', function(done) {
			var shouldNotBeCalled = true;
			instance.hook($.PRE_TEST, function() {
				shouldNotBeCalled = false;
			}).callHook($.PRE_TEST, function() {
				expect(shouldNotBeCalled).to.be.true();
				done();
			});
		});
	}

	describe('an error thrown by a sync middleware', function() {
		beforeEach(function() {
			instance.hook($.PRE_TEST, function() {
				throw error;
			});
		});
		testErrorHandling();
	});

	describe('an error passed to `next` by an async serial middleware function', function() {
		beforeEach(function() {
			instance.hook($.PRE_TEST, function(next) {
				setTimeout(function() {
					next(error);
				}, 0);
			});
		});
		testErrorHandling();

	});

	describe('an error passed to `next` by an async parallel middleware function', function() {
		beforeEach(function() {
			instance.hook($.PRE_TEST, function(next, done) {//eslint-disable-line no-unused-vars
				setTimeout(function() {
					next(error);
				}, 0);
			});
		});
		testErrorHandling();
	});

	describe('an error passed to `done` by async parallel middleware function', function() {
		it('should be passed to `callback`', function(done) {
			instance.hook($.PRE_TEST, function(next, done) {
				setTimeout(function() {
					done(error);
				}, 0);
			}).callHook($.PRE_TEST, function(actual) {
				expect(actual).to.equal(error);
				done();
			});
		});
	});

	describe('an error passed to `next` by an async serial middleware function', function() {
		it('should prohibit parallel middleware from calling the final callback (again)', function(done) {
			var parallelFinished = false;
			instance.hook($.PRE_TEST, function(next, done) {
				setTimeout(function() {
					parallelFinished = true;
					done();
				}, 0);
				next();
			}).hook($.PRE_TEST, function(next) {
				next(error);
			}).callHook($.PRE_TEST, function() {
				expect(parallelFinished).to.be.false();
				//this doesn't look like it's testing what it should, but if this wasn't
				//functioning as it should `done` would be called twice -> mocha error
				done();
			});
		});
	});

	describe('an error rejecting a promise', function() {
		var promise, resolve, reject;//eslint-disable-line no-unused-vars
		beforeEach(function() {
			promise = new P(function(succeed, fail) {
				resolve = succeed;
				reject = fail;
			});

			instance.hook($.PRE_TEST, function() {
				setTimeout(function() {
					reject(error);
				}, 0);

				return promise;
			});
		});
		testErrorHandling();
	});
});
