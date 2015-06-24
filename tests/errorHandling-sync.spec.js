'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');

describe('sync hooks: error handling', function() {
	var instance;
	var error;
	beforeEach(function() {
		error = new Error('middleware error');
		instance = subject.create();
		instance.allowHooks($.PRE_TEST);
	});

	describe('an error thrown by a sync middleware', function() {
		beforeEach(function() {
			instance.hook($.PRE_TEST, function() {
				throw error;
			});
		});
		it('should bubble through', function() {
			expect(function() {
				instance.callSyncHook($.PRE_TEST);
			}).to.throw(/middleware error/);
		});
		it('should stop execution of other middleware', function() {
			var isCalled = false;
			instance.hook(
				$.PRE_TEST,
				function() {
					throw error;
				},
				function() {
					isCalled = true;
				}
			);
			try {
				instance.callSyncHook($.PRE_TEST);
			} catch (err) { //eslint-disable-line no-empty
			}
			expect(isCalled).to.be.false();
		});
	});
});
