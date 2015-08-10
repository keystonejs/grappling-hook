'use strict';

var _ = require('lodash');
var P = require('bluebird');

var Ref = function(opts) {
	_.defaults(this, opts, {
		phase: 'initialized'
	});
};

Ref.prototype.clone = function(opts) {
	return new Ref(_.defaults(opts, this));
};

Ref.prototype.toString = function() {
	return this.name + ' (' + this.type + ') ' + this.phase;
};

module.exports.createParallel = function createParallel(name, receiver, timeout) {
	var ref = new Ref({
		name: name,
		type: 'parallel'
	});
	return function(next, done) {
		receiver.push(ref.clone({
			phase: 'setup'
		}));
		setTimeout(function() {
			receiver.push(ref.clone({
				phase: 'done'
			}));
			done();
		}, timeout || 0);
		next();
	};
};

module.exports.createParallelWithArgs = function createParallelWithArgs(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'parallel',
		payload: undefined
	});
	return function(foo, bar, next, done) {
		receiver.push(ref.clone({
			phase: 'setup',
			payload: [foo, bar]
		}));
		setTimeout(function() {
			receiver.push(ref.clone({
				phase: 'done',
				payload: [foo, bar]
			}));
			done();
		}, 0);
		next();
	};
};

module.exports.createSerial = function createSerial(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'serial'
	});
	return function(next) {
		receiver.push(ref.clone({
			phase: 'setup'
		}));
		setTimeout(function() {
			receiver.push(ref.clone({
				phase: 'done'
			}));
			next();
		}, 0);
	};
};

module.exports.createSerialWithArgs = function createSerialWithArgs(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'serial'
	});
	return function(foo, bar, next) {
		receiver.push(ref.clone({
			phase: 'setup',
			payload: [foo, bar]
		}));
		setTimeout(function() {
			receiver.push(ref.clone({
				phase: 'done',
				payload: [foo, bar]
			}));
			next();
		}, 0);
	};
};

module.exports.createSync = function createSync(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'sync'
	});
	return function() {
		receiver.push(ref.clone({
			phase: 'done'
		}));
	};
};

module.exports.createSyncWithArgs = function createSyncWithArgs(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'sync'
	});
	return function(foo, bar) {
		receiver.push(ref.clone({
			phase: 'done',
			payload: [foo, bar]
		}));
	};
};

module.exports.createThenable = function createThenable(name, receiver) {
	var ref = new Ref({
		name: name,
		type: 'thenable'
	});
	return function() {
		var resolve;
		var thenable = new P(function(succeed, fail) {//eslint-disable-line no-unused-vars
			resolve = succeed;
		});
		receiver.push(ref.clone({
			phase: 'setup'
		}));
		setTimeout(function() {
			receiver.push(ref.clone({
				phase: 'done'
			}));
			resolve();
		}, 0);
		return thenable;
	};

};
module.exports.toRefString = function(sequence) {
	return _.map(sequence, function(ref) {
		return ref.toString();
	});
};

module.exports.Ref = Ref;
