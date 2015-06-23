'use strict';

/**
 * Middleware are callbacks that will be executed when a hook is called. The type of middleware is determined through the parameters it declares.
 * @example
 * function(){
 * 	//synchronous execution
 * }
 * @example
 * function(next){
 * 	//asynchronous execution, i.e. further execution is halted until `next` is called.
 * 	setTimeout(next, 1000);
 * }
 * @example
 * function(next, done){
 * 	//asynchronous execution, i.e. further execution is halted until `next` is called.
 * 	setTimeout(next, 1000);
 * 	//full middleware queue handling is halted until `done` is called.
 * 	setTimeout(done, 2000);
 * }
 * @callback middleware
 * @param {...*} [parameters] - parameters passed to the hook
 * @param {function} [next] - pass control to the next middleware
 * @param {function} [done] - mark parallel middleware to have completed
 */

/**
 * @typedef {Object} options
 * @property {Boolean} [strict=true] - Will disallow subscribing to middleware bar the explicitly registered ones.
 * @property {Object} [qualifiers]
 * @property {String} [qualifiers.pre='pre'] - Declares the 'pre' qualifier
 * @property {String} [qualifiers.post='post'] - Declares the 'post' qualifier
 * @example
 * //creates a GrapplingHook instance with `before` and `after` hooking
 * var instance = grappling.create({
 *   qualifiers: {
 *     pre: 'before',
 *     post: 'after'	
 *   }
 * });
 * instance.before('save', console.log);
 */

var _ = require('lodash');
var async = require('async');

var settings = {};

function parseHook(hook) {
	var parsed = (hook) ? hook.split(':') : [];
	var n = parsed.length;
	return {
		type: parsed[n - 2],
		name: parsed[n - 1]
	};
}

/**
 *
 * @param instance grappling-hook instance
 * @param hookType qualifier
 * @param hookName action
 * @param args
 * @private
 */
function addMiddleware(instance, hook, args) {
	var fns = _.flatten(args);
	var cache = instance.__grappling;
	var mw = [];
	if (!cache.middleware[hook]) {
		if (cache.opts.strict) throw new Error('Hooks for ' + hook + ' are not supported.');
	} else {
		mw = cache.middleware[hook];
	}
	cache.middleware[hook] = mw.concat(fns);
}

function attachQualifier(instance, qualifier) {
	/**
	 * Registers `middleware` to be executed _before_ `hook`.
	 * This is a dynamically added method, that may not be present if otherwise configured in {@link options}.
	 * @method pre
	 * @instance
	 * @memberof GrapplingHook
	 * @param {string} hook - hook name, e.g. `'save'`
	 * @param {...middleware|middleware[]} middleware - middleware to register
	 * @example
	 * instance.pre('save', function(){
	 *   console.log('before saving');
	 * });
	 */
	/**
	 * Registers `middleware` to be executed _after_ `hook`.
	 * This is a dynamically added method, that may not be present if otherwise configured in {@link options}.
	 * @method post
	 * @instance
	 * @memberof GrapplingHook
	 * @param {string} hook - hook name, e.g. `'save'`
	 * @param {...middleware|middleware[]} middleware - middleware to register
	 * @example
	 * instance.post('save', function(){
	 *   console.log('after saving');
	 * });
	 */
	instance[qualifier] = function() {
		var args = _.toArray(arguments);
		addMiddleware(this, qualifier + ':' + args.shift(), args);
		return this;
	};
}

function init(opts) {
	if (_.isString(opts)) {
		opts = settings[opts];
	}
	this.__grappling = {
		middleware: {},
		opts: _.defaults({}, opts, {
			strict: true,
			qualifiers: {
				pre: 'pre',
				post: 'post'
			}
		})
	};
	var q = this.__grappling.opts.qualifiers;
	attachQualifier(this, q.pre);
	attachQualifier(this, q.post);
}

/*
 based on code from Isaac Schlueter's blog post: 
 http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony
 */
function dezalgo(callback, context, args, next, done) {
	var isSync = true;
	callback.apply(context, args.concat(safeNext, done)); //eslint-disable-line no-use-before-define
	isSync = false;
	function safeNext(err) {
		if (isSync) {
			process.nextTick(function() {
				next(err);
			});
		} else {
			next(err);
		}
	}
}

function iterateAsyncMiddleware(context, middleware, args, done) {
	done = done || /* istanbul ignore next: untestable */ function(err) {
			if (err) {
				throw err;
			}
		};
	var asyncFinished = false;
	var waiting = [];
	var wait = function(callback) {
		waiting.push(callback);
		return function(err) {
			waiting.splice(waiting.indexOf(callback), 1);
			if (asyncFinished !== done) {
				if (err || (asyncFinished && !waiting.length)) {
					done(err);
				}
			}
		};
	};
	async.eachSeries(middleware, function(callback, next) {
		var d = (callback.isAsync) ? 1 : callback.length - args.length;
		switch (d) {
			case 1: //async series
				callback.apply( context, args.concat(next));
				break;
			case 2: //async parallel
				callback.apply( context, args.concat(next, wait(callback)));
				break;
			default :
				//synced
				var err;
				try {
					callback.apply(context, args);
				} catch (e) {
					err = e;
				}
				next(err);
		}
	}, function(err) {
		asyncFinished = (err) ? done : true;
		if (err || !waiting.length) {
			done(err);
		}
	});
}

function iterateSyncMiddleware(context, middleware, args) {
	_.each(middleware, function(callback) {
		callback.apply(context, args);
	});
}

/**
 *
 * @param hookObj
 * @returns {*}
 * @private
 */
function qualifyHook(hookObj) {
	if (!hookObj.name || !hookObj.type) {
		throw new Error('Only qualified hooks are allowed, e.g. "pre:save", not "save"');
	}
	return hookObj;
}

function createHooks(instance, config) {
	var q = instance.__grappling.opts.qualifiers;
	_.each(config, function(fn, hook) {
		var hookObj = parseHook(hook);
		instance[hookObj.name] = function() {
			var args = _.toArray(arguments);
			var n = args.length - 1;
			if (!_.isFunction(args[n])) {
				throw new Error('Async methods should receive a callback as a final parameter');
			}
			var middleware = instance.getMiddleware(q.pre + ':' + hookObj.name);
			var post = instance.getMiddleware(q.post + ':' + hookObj.name);
			var callback = args[n];
			if (post.length) {
				var callOriginal = function() {
					var args = _.toArray(arguments);
					fn.apply(instance, args);
				};
				callOriginal.isAsync = true;
				middleware.push(callOriginal);
				middleware = middleware.concat(post);
			} else {
				callback = function() {
					fn.apply(instance, args);
				};
			}
			dezalgo(iterateAsyncMiddleware, null, [instance, middleware, args.slice(0, n)], callback);
		};
	});
}

function createSyncHooks(instance, config) {
	var q = instance.__grappling.opts.qualifiers;
	_.each(config, function(fn, hook) {
		var hookObj = parseHook(hook);
		instance[hookObj.name] = function() {
			var args = _.toArray(arguments);
			var middleware = instance.getMiddleware(q.pre + ':' + hookObj.name);
			var result;
			var callOriginal = function() {
				result = fn.apply(instance, args);
			};
			middleware.push(callOriginal);
			middleware = middleware.concat(instance.getMiddleware(q.post + ':' + hookObj.name));
			iterateSyncMiddleware(instance, middleware, args);
			return result;
		};
	});
}

function addHooks(instance, args) {
	var config = {};
	_.each(args, function(mixed) {
		if (_.isString(mixed)) {
			var hookObj = parseHook(mixed);
			var fn = instance[hookObj.name];
			if (!fn) throw new Error('Cannot add hooks to undeclared method:"' + hookObj.name + '"'); //non-existing method
			config[mixed] = fn;
		} else if (_.isObject(mixed)) {
			_.defaults(config, mixed);
		} else {
			throw new Error('`addHooks` expects (arrays of) Strings or Objects');
		}
	}, instance);
	instance.allowHooks(_.keys(config));
	return config;
}

function parseCallHookParams(instance, args) {
	return {
		context: (_.isString(args[0])) ? instance : args.shift(),
		hook: args.shift(),
		args: _.flatten(args)
	};
}

/**
 * Grappling hook
 * @alias GrapplingHook
 * @mixin
 */
var methods = {

	/**
	 * Adds middleware to a hook
	 *
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {(...middleware|middleware[])} middleware - middleware to call
	 * @instance
	 * @public
	 * @example
	 * instance.hook('pre:save', function(next) {
	 *   console.log('before saving');
	 *   next();
	 * }
	 */
	hook: function() {
		var args = _.toArray(arguments);
		qualifyHook(parseHook(args[0]));
		addMiddleware(this, args.shift(), args);
		return this;
	},

	/**
	 * Removes {@link middleware} for `hook`
	 * @instance
	 * @example
	 * //removes `onPreSave` Function as a `pre:save` middleware
	 * instance.unhook('pre:save', onPreSave);
	 * @example
	 * //removes all middleware for `pre:save`
	 * instance.unhook('pre:save');
	 * @example
	 * //removes all middleware for `pre:save` and `post:save`
	 * instance.unhook('save');
	 * @example
	 * //removes ALL middleware
	 * instance.unhook();
	 * @param {String} [hook] - (qualified) hooks e.g. `pre:save` or `save`
	 * @param {(...middleware|middleware[])} [middleware] - function(s) to be removed
	 */
	unhook: function() {
		var fns = _.toArray(arguments);
		var hook = fns.shift();
		var hookObj = parseHook(hook);
		var middleware = this.__grappling.middleware;
		var q = this.__grappling.opts.qualifiers;
		if (hookObj.type || fns.length) {
			qualifyHook(hookObj);
			if (middleware[hook]) middleware[hook] = (fns.length ) ? _.without.apply(null, [middleware[hook]].concat(fns)) : [];
		} else if (hookObj.name) {
			/* istanbul ignore else: nothing _should_ happen */
			if (middleware[q.pre + ':' + hookObj.name]) middleware[q.pre + ':' + hookObj.name] = [];
			/* istanbul ignore else: nothing _should_ happen */
			if (middleware[q.post + ':' + hookObj.name]) middleware[q.post + ':' + hookObj.name] = [];
		} else {
			_.each(middleware, function(callbacks, hook) {
				middleware[hook] = [];
			});
		}
		return this;
	},

	/**
	 * Determines whether registration of middleware to `qualifiedHook` is allowed. (Always returns `true` for lenient instances)
	 * @instance
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @returns {boolean}
	 */
	hookable: function(qualifiedHook) {
		qualifyHook(parseHook(qualifiedHook));
		return (this.__grappling.opts.strict) ? !!this.__grappling.middleware[qualifiedHook] : true;
	},

	/**
	 * Explicitly declare hooks
	 * @instance
	 * @param {(...string|string[])} hooks - (qualified) hooks e.g. `pre:save` or `save`
	 */
	allowHooks: function() {
		var args = _.flatten(_.toArray(arguments));
		var q = this.__grappling.opts.qualifiers;
		_.each(args, function(hook) {
			if (!_.isString(hook)) {
				throw new Error('`allowHooks` expects (arrays of) Strings');
			}
			var hookObj = parseHook(hook);
			var middleware = this.__grappling.middleware;
			if (hookObj.type) {
				if (hookObj.type !== q.pre && hookObj.type !== q.post) {
					throw new Error('Only "' + q.pre + '" and "' + q.post + '" types are allowed, not "' + hookObj.type + '"');
				}
				middleware[hook] = middleware[hook] || [];
			} else {
				middleware[q.pre + ':' + hookObj.name] = middleware[q.pre + ':' + hookObj.name] || [];
				middleware[q.post + ':' + hookObj.name] = middleware[q.post + ':' + hookObj.name] || [];
			}
		}, this);
		return this;
	},

	/**
	 * Wraps asynchronous methods/functions with `pre` and/or `post` hooks
	 * @instance
	 * @see {@link GrapplingHook#addSyncHooks} for wrapping synchronous methods
	 * @example
	 * //wrap existing methods
	 * instance.addHooks('save', 'pre:remove');
	 * @example
	 * //add method and wrap it
	 * instance.addHooks({
	 *   save: instance._upload,
	 *   "pre:remove": function(){
	 *   	//...
	 *   }
	 * });
	 * @param {(...String|String[]|...Object|Object[])} methods - method(s) that need(s) to emit `pre` and `post` events
	 */
	addHooks: function() {
		var config = addHooks(this, _.flatten(_.toArray(arguments)));
		createHooks(this, config);
		return this;
	},

	/**
	 * Wraps synchronous methods/functions with `pre` and/or `post` hooks
	 * @instance
	 * @see {@link GrapplingHook#addHooks} for wrapping asynchronous methods
	 * @param {(...String|String[]|...Object|Object[])} methods - method(s) that need(s) to emit `pre` and `post` events
	 */
	addSyncHooks: function() {
		var config = addHooks(this, _.flatten(_.toArray(arguments)));
		createSyncHooks(this, config);
		return this;
	},

	/**
	 * Calls all middleware subscribed to the asynchronous `qualifiedHook` and passes remaining parameters to them
	 * @instance
	 * @see {@link GrapplingHook#callSyncHook} for calling synchronous hooks
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 * @param {Function} [callback] - will be called when all middleware have finished
	 */
	callHook: function() {
		var params = parseCallHookParams(this, _.toArray(arguments));
		params.done = (_.isFunction(params.args[params.args.length - 1])) ? params.args.pop() : null;
		dezalgo(iterateAsyncMiddleware, null, [params.context, this.getMiddleware(params.hook), params.args], params.done);
		return this;
	},

	/**
	 * Calls all middleware subscribed to the synchronous `qualifiedHook` and passes remaining parameters to them
	 * @instance
	 * @see {@link GrapplingHook#callHook} for calling asynchronous hooks
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 */
	callSyncHook: function() {
		var params = parseCallHookParams(this, _.toArray(arguments));
		iterateSyncMiddleware(params.context, this.getMiddleware(params.hook), params.args);
		return this;
	},

	/**
	 * Retrieve all {@link middleware} registered to `qualifiedHook`
	 * @instance
	 * @param qualifiedHook - qualified hook, e.g. `pre:save`
	 * @returns {middleware[]}
	 */
	getMiddleware: function(qualifiedHook) {
		qualifyHook(parseHook(qualifiedHook));
		var middleware = this.__grappling.middleware[qualifiedHook];
		if (middleware) {
			return middleware.slice(0);
		}
		return [];
	},

	/**
	 * Determines whether any {@link middleware} is registered to `qualifiedHook`.
	 * @instance
	 * @param {string} qualifiedHook - qualified hook, e.g. `pre:save`
	 * @returns {boolean}
	 */
	hasMiddleware: function(qualifiedHook) {
		return this.getMiddleware(qualifiedHook).length > 0;
	}
};

/**
 * @module grappling-hook
 * @type {exports|module.exports}
 */
module.exports = {
	/**
	 * Mixes {@link GrapplingHook} methods into `instance`.
	 * @param {Object} instance
	 * @param {options|string} [opts] - {@link options} or an options cache name, see {@link module:grappling-hook.define define}.
	 * @mixes GrapplingHook
	 * @returns {GrapplingHook}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var instance = {
	 * };
	 * grappling.mixin(instance); // add grappling-hook functionality to an existing object
	 */
	mixin: function mixin(instance, opts) {
		init.call(instance, opts);
		_.extend(instance, methods);
		return instance;
	},

	/**
	 * Creates an object with {@link GrapplingHook} functionality.
	 * @param {options|string} [opts] - {@link options} or an options cache name, see {@link module:grappling-hook.define define}.
	 * @returns {GrapplingHook}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var instance = grappling.create(); // create an instance
	 */
	create: function create(opts) {
		return module.exports.mixin({}, opts);
	},

	/**
	 * Attaches {@link GrapplingHook} methods to `clazz`'s `prototype`.
	 * @param {Function} clazz
	 * @param {options|string} [opts] - {@link options} or an options cache name, see {@link module:grappling-hook.define define}.
	 * @mixes GrapplingHook
	 * @returns {Function}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var Clazz = function() {
	 * };
	 * Clazz.prototype.save = function(done) {
	 *   console.log('save!');
	 *   done();
	 * };
	 * grappling.attach(Clazz); // attach grappling-hook functionality to a 'class'
	 */
	attach: function attach(clazz, opts) {
		module.exports.mixin(clazz.prototype, opts);
		return clazz;
	},

	/**
	 * Cache options as `name`.
	 * @param {string} name
	 * @param {options} opts
	 * @returns {module:grappling-hook}
	 * @example
	 * //index.js
	 * var grappling = require('grappling-hook');
	 * grappling.define('example', {
	 *   strict: false,
	 *   qualifiers: {
	 *     pre: 'before',
	 *     post: 'after'
	 *   }
	 * });
	 *
	 * //foo.js
	 * var instance = grappling.create('example'); // uses options as cached for 'example'
	 */
	define: function(name, opts) {
		if (settings[name]) {
			throw new Error('Settings for "' + name + '" already defined.');
		}
		settings[name] = opts;
		return module.exports;
	}
};
