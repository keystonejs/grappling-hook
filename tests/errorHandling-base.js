'use strict';

/* eslint-env node, mocha */

var $ = require('./fixtures');
var P = require('bluebird');

module.exports = function(subject, presetsName, testErrorHandling) {
	var testdata = {
		instance: undefined,
		error: undefined
	};
	beforeEach(function() {
		testdata.error = new Error('middleware error');
		testdata.instance = subject.create(presetsName);
		testdata.instance.allowHooks($.PRE_TEST);
	});

	describe('an error thrown by a sync middleware', function() {
		beforeEach(function() {
			testdata.instance.hook($.PRE_TEST, function() {
				throw testdata.error;
			});
		});
		testErrorHandling(testdata);
	});

	describe('an error passed to `next` by an async serial middleware function', function() {
		beforeEach(function() {
			testdata.instance.hook($.PRE_TEST, function(next) {
				setTimeout(function() {
					next(testdata.error);
				}, 0);
			});
		});
		testErrorHandling(testdata);
	});

	describe('an error passed to `next` by an async parallel middleware function', function() {
		beforeEach(function() {
			testdata.instance.hook($.PRE_TEST, function(next, done) {//eslint-disable-line no-unused-vars
				setTimeout(function() {
					next(testdata.error);
				}, 0);
			});
		});
		testErrorHandling(testdata);
	});

	describe('an error rejecting a promise', function() {
		var promise, resolve, reject;//eslint-disable-line no-unused-vars
		beforeEach(function() {
			promise = new P(function(succeed, fail) {
				resolve = succeed;
				reject = fail;
			});

			testdata.instance.hook($.PRE_TEST, function() {
				setTimeout(function() {
					reject(testdata.error);
				}, 0);

				return promise;
			});
		});
		testErrorHandling(testdata);
	});
};
