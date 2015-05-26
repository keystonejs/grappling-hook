'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var sinon = require('sinon');
var $ = require('./fixtures');
var P = require('bluebird');

describe('-- promises --', function() {
	describe('middleware', function() {
		var instance;
		var promise;
		var thenSpy;
		var resolve;
		var reject;
		beforeEach(function() {
			instance = subject.create();
			instance.allowHooks($.PRE_TEST);
			promise = new P(function(succeed, fail) {
				resolve = succeed;
				reject = fail;
			});
			thenSpy = sinon.spy(promise, 'then');
		});

		it('should halt all further middleware execution until resolved', function(done) {
			instance.pre($.TEST, function() {
				return promise;
			}).callHook($.PRE_TEST, function() {
				expect(thenSpy.callCount).to.equal(1);
				done();
			});
			resolve();
		});
		it('should halt all further middleware execution until failed', function(done) {
			instance.pre($.TEST, function() {
				return promise;
			}).callHook($.PRE_TEST, function() {
				expect(thenSpy.callCount).to.equal(1);
				done();
			});
			reject();
		});
		it('should pass errors to the final callback', function(done) {
			var error = new Error('error');
			instance.pre($.TEST, function() {
				return promise;
			}).callHook($.PRE_TEST, function(err) {
				expect(err).to.equal(error);
				done();
			});
			reject(error);
		});
	});
	
});
