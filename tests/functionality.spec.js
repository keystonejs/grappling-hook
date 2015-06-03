'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');

describe('-- functionality --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});

	var instance;
	beforeEach(function() {
		instance = subject.create();
	});
	
	describe('wrapped async methods', function() {
		it('should pass all parameters to async serial pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to sync pre middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.pre('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async serial post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b, next) {
					passed = [a, b];
					next();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to async parallel post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b, next, done) {
					passed = [a, b];
					next();
					done();
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
		it('should pass all parameters to sync post middleware; #11', function(done) {
			var passed;
			var a = 1;
			var b = 'b';
			instance.test = function(a, b, done) {
				done();
			};
			instance.addHooks('test')
				.post('test', function(a, b) {
					passed = [a, b];
				})
				.test(a, b, function() {
					expect(passed).to.eql([a, b]);
					done();
				});
		});
	});
	describe('wrapped sync methods', function() {
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
