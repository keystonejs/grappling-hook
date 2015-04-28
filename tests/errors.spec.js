'use strict';

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');

describe('-- error handling --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});


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
			})
		});
		testErrorHandling();
	});

	describe('an error passed to `next` by an async parallel middleware function', function() {
		beforeEach(function() {
			instance.hook($.PRE_TEST, function(next, done) {
				setTimeout(function() {
					next(error);
				}, 0);
			})
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

});
