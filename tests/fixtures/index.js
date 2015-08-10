var _ = require('lodash');

module.exports = require('require-directory')(module);
module.exports.MEMBERS = [
	//	'pre', 
	//	'post', 
	'hook',
	'unhook',
	'allowHooks',
	'addHooks',
	'addSyncHooks',
	'callHook',
	'callSyncHook',
	'getMiddleware',
	'hasMiddleware',
	'hookable'
];
module.exports.PRE_TEST = 'pre:test';
module.exports.POST_TEST = 'post:test';
module.exports.TEST = 'test';
module.exports.isGrapplingHook = function(subject) {
	return _.every(module.exports.MEMBERS, function(member) {
		return typeof subject[member] !== 'undefined';
	});
};
