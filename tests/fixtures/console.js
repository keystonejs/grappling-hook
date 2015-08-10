'use strict';
var _ = require('lodash');

function Console() {
	this.logs = [];
}

Console.prototype.log = function() {
	this.logs.push(_.toArray(arguments).join(' '));
};
module.exports = function() {
	return new Console();
};
