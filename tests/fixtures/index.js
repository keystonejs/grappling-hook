module.exports = require('require-directory')(module);
module.exports.MEMBERS = ['pre', 'post', 'hook', 'unhook', 'allowHooks', 'addHooks', 'addSyncHooks', 'callHook', 'callSyncHook', 'getMiddleware', 'hasMiddleware', 'hookable', '__grappling'];
module.exports.PRE_TEST = 'pre:test';
module.exports.POST_TEST = 'post:test';
module.exports.TEST = 'test';
