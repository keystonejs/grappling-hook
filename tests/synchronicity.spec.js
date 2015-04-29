'use strict';

/* eslint-env node, mocha */

var expect = require('must');
var subject = require('../index');
var $ = require('./fixtures');

describe('-- synchronicity --', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});

	var instance;
	beforeEach(function() {
		instance = subject.create();
		instance.allowHooks($.PRE_TEST);
	});
	it('should finish async even with sync middleware', function(done){
		var isAsync = false;
		instance.hook($.PRE_TEST, function(){
		}).callHook($.PRE_TEST, function(){
			expect(isAsync).to.be.true();
			done();
		});
		isAsync = true;
	});
	it('should finish async even with sync serial middleware', function(done){
		var isAsync = false;
		instance.hook($.PRE_TEST, function(next){
			next();
		}).callHook($.PRE_TEST, function(){
			expect(isAsync).to.be.true();
			done();
		});
		isAsync = true;
	});
	it('should finish async even with sync parallel middleware', function(done){
		var isAsync = false;
		instance.hook($.PRE_TEST, function(next, done){
			next();
			done();
		}).callHook($.PRE_TEST, function(){
			expect(isAsync).to.be.true();
			done();
		});
		isAsync = true;
	});
	
	it('should call the next middleware async even with sync serial middleware', function(done){
		var isAsync;
		instance.hook($.PRE_TEST, function(next){
			isAsync = false;
			next();
			isAsync = true;
		}, function(){
			expect(isAsync).to.be.true();
		}).callHook($.PRE_TEST, function(){
			done();
		});
	});
	
	it('should call the next middleware async even with sync parallel middleware', function(done){
		var isAsync;
		instance.hook($.PRE_TEST, function(next, done){
			isAsync = false;
			next();
			isAsync = true;
			done();
		}, function(){
			expect(isAsync).to.be.true();
		}).callHook($.PRE_TEST, function(){
			done();
		});
	});

});
