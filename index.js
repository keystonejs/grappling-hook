'use strict';

/**
 * Middleware are callbacks that will be executed when a hook is called. The type of middleware is determined through the parameters it declares.
 * @example
 * function(){
 *   //synchronous execution
 * }
 * @example
 * function(){
 *   //create promise, i.e. further execution is halted until the promise is resolved.
 *   return promise;
 * }
 * @example
 * function(next){
 *   //asynchronous execution, i.e. further execution is halted until `next` is called.
 *   setTimeout(next, 1000);
 * }
 * @example
 * function(next, done){
 *   //asynchronous execution, i.e. further execution is halted until `next` is called.
 *   setTimeout(next, 1000);
 *   //full middleware queue handling is halted until `done` is called.
 *   setTimeout(done, 2000);
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
 * @property {Function} [createThenable=undefined] - Set a Promise A+ compliant factory function for creating promises.
 * @example
 * //creates a GrapplingHook instance with `before` and `after` hooking
 * var instance = grappling.create({
 *   qualifiers: {
 *     pre: 'before',
 *     post: 'after'	
 *   }
 * });
 * instance.before('save', console.log);
 * @example
 * //creates a GrapplingHook instance with a promise factory
 * var P = require('bluebird');
 * var instance = grappling.create({
 *   createThenable: function(fn){
 *     return new P(fn);
 *   }
 * });
 * instance.allowHooks('save');
 * instance.pre('save', console.log);
 * instance.callThenableHook('pre:save', 'Here we go!').then(function(){
 *   console.log('And finish!');
 * });
 * //outputs:
 * //Here we go!
 * //And finish!
 */

/**
 * The GrapplingHook documentation uses the term "thenable" instead of "promise", since what we need here is not _necessarily_ a promise, but a thenable, as defined in the <a href="https://promisesaplus.com/">Promises A+ spec</a>.
 * Thenable middleware for instance can be _any_ object that has a `then` function.
 * Strictly speaking the only instance where we adhere to the full Promises A+ definition of a promise is in {@link options}.createThenable. 
 * For reasons of clarity, uniformity and symmetry we chose `createThenable`, although strictly speaking it should've been `createPromise`.
 * Most people would find it confusing if part of the API uses 'thenable' and another part 'promise'.
 * @typedef {Object} thenable
 * @property {Function} then - see <a href="https://promisesaplus.com/">Promises A+ spec</a>
 * @see {@link options}.createThenable
 * @see {@link module:grappling-hook.isThenable isThenable}
 */

var _ = require('lodash');
var async = require('async');

var presets = {};

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
	 * This is a dynamically added method, that may not be present if otherwise configured in {@link options}.qualifiers.
	 * @method pre
	 * @instance
	 * @memberof GrapplingHook
	 * @param {string} hook - hook name, e.g. `'save'`
	 * @param {(...middleware|middleware[])} [middleware] - middleware to register
	 * @returns {GrapplingHook|thenable} the {@link GrapplingHook} instance itself, or a {@link thenable} if no middleware was provided.
	 * @example
	 * instance.pre('save', function(){
	 *   console.log('before saving');
	 * });
	 * @see {@link GrapplingHook#post} for registering middleware functions to `post` hooks.
	 */
	/**
	 * Registers `middleware` to be executed _after_ `hook`.
	 * This is a dynamically added method, that may not be present if otherwise configured in {@link options}.qualifiers.
	 * @method post
	 * @instance
	 * @memberof GrapplingHook
	 * @param {string} hook - hook name, e.g. `'save'`
	 * @param {(...middleware|middleware[])} [middleware] - middleware to register
	 * @returns {GrapplingHook|thenable} the {@link GrapplingHook} instance itself, or a {@link thenable} if no middleware was provided.
	 * @example
	 * instance.post('save', function(){
	 *   console.log('after saving');
	 * });
	 * @see {@link GrapplingHook#pre} for registering middleware functions to `post` hooks.
	 */
	instance[qualifier] = function() {
		var fns = _.toArray(arguments);
		var hookName = fns.shift();
		var output;
		if(fns.length){ //old skool way with callbacks
			output = this;
		}else{
			output = this.__grappling.opts.createThenable(function(resolve){
				fns = [resolve];
			});
		}
		addMiddleware(this, qualifier + ':' + hookName, fns);
		return output;
	};
}

function init(name, opts) {
	if (arguments.length === 1 && _.isObject(name)) {
		opts = name;
		name = undefined;
	}
	var presets;
	if (name) {
		presets = module.exports.get(name);
	}
	this.__grappling = {
		middleware: {},
		opts: _.defaults({}, opts, presets, {
			strict: true,
			qualifiers: {
				pre: 'pre',
				post: 'post'
			},
			createThenable: function(){
				throw new Error('Instance not set up for thenable creation, please set `opts.createThenable`');
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
function dezalgofy(fn, done) {
	var isSync = true;
	fn(safeDone); //eslint-disable-line no-use-before-define
	isSync = false;
	function safeDone() {
		var args = _.toArray(arguments);
		if (isSync) {
			process.nextTick(function() {
				done.apply(null, args);
			});
		} else {
			done.apply(null, args);
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
		var d = callback.length - args.length;
		switch (d) {
			case 1: //async series
				callback.apply(context, args.concat(next));
				break;
			case 2: //async parallel
				callback.apply(context, args.concat(next, wait(callback)));
				break;
			default :
				//synced
				var err;
				var result;
				try {
					result = callback.apply(context, args);
				} catch (e) {
					err = e;
				}
				if (!err && module.exports.isThenable(result)) {
					//thenable
					result.then(function() {
						next();
					}, next);
				} else {
					//synced
					next(err);
				}
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
			var done = args.pop();
			if (!_.isFunction(done)) {
				throw new Error('Async methods should receive a callback as a final parameter');
			}
			var results;
			dezalgofy(function(safeDone) {
				async.series([function(next) {
					iterateAsyncMiddleware(instance, instance.getMiddleware(q.pre + ':' + hookObj.name), args, next);
				}, function(next) {
					fn.apply(instance, args.concat(function() {
						var args = _.toArray(arguments);
						var err = args.shift();
						results = args;
						next(err);
					}));
				}, function(next) {
					iterateAsyncMiddleware(instance, instance.getMiddleware(q.post + ':' + hookObj.name), args, next);
				}], function(err) {
					safeDone.apply(null, [err].concat(results));
				});
			}, done);
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
			middleware.push(function() {
				result = fn.apply(instance, args);
			});
			middleware = middleware.concat(instance.getMiddleware(q.post + ':' + hookObj.name));
			iterateSyncMiddleware(instance, middleware, args);
			return result;
		};
	});
}

function createThenableHooks(instance, config) {
	var opts = instance.__grappling.opts;
	var q = instance.__grappling.opts.qualifiers;
	_.each(config, function(fn, hook) {
		var hookObj = parseHook(hook);
		instance[hookObj.name] = function() {
			var args = _.toArray(arguments);
			var deferred = {};
			var thenable = opts.createThenable(function(resolve, reject) {
				deferred.resolve = resolve;
				deferred.reject = reject;
			});
			async.series([function(next) {
				iterateAsyncMiddleware(instance, instance.getMiddleware(q.pre + ':' + hookObj.name), args, next);
			}, function(next) {
				fn.apply(instance, args).then(function(result) {
					deferred.result = result;
					next();
				}, next);
			}, function(next) {
				iterateAsyncMiddleware(instance, instance.getMiddleware(q.post + ':' + hookObj.name), args, next);
			}], function(err) {
				if (err) {
					return deferred.reject(err);
				}
				return deferred.resolve(deferred.result);
			});
			
			return thenable;
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
		args: args
	};
}

/**
 * Grappling hook
 * @alias GrapplingHook
 * @mixin
 */
var methods = {

	/**
	 * Adds middleware to a qualified hook.
	 * Convenience method which allows you to add middleware dynamically more easily.
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
	 * @returns {GrapplingHook|thenable}
	 */
	hook: function() {
		var fns = _.toArray(arguments);
		var hook = fns.shift();
		var output;
		qualifyHook(parseHook(hook));
		if(fns.length){
			output = this;
		}else{
			output = this.__grappling.opts.createThenable(function(resolve){
				fns = [resolve];
			});
		}
		addMiddleware(this, hook, fns);
		return output;
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
	 * @returns {GrapplingHook}
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
	 * @param {String|String[]} qualifiedHook - qualified hook e.g. `pre:save`
	 * @returns {boolean}
	 */
	hookable: function(qualifiedHook) { //eslint-disable-line no-unused-vars
		if (!this.__grappling.opts.strict) {
			return true;
		}
		var args = _.flatten(_.toArray(arguments));
		return _.every(args, function(qualifiedHook) {
			qualifyHook(parseHook(qualifiedHook));
			return !!this.__grappling.middleware[qualifiedHook];
		}, this);
	},

	/**
	 * Explicitly declare hooks
	 * @instance
	 * @param {(...string|string[])} hooks - (qualified) hooks e.g. `pre:save` or `save`
	 * @returns {GrapplingHook}
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
	 * @see {@link GrapplingHook#addThenableHooks} for wrapping thenable methods
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
	 * @returns {GrapplingHook}
	 */
	addHooks: function() {
		var config = addHooks(this, _.flatten(_.toArray(arguments)));
		createHooks(this, config);
		return this;
	},

	/**
	 * Wraps synchronous methods/functions with `pre` and/or `post` hooks
	 * @since 2.4.0
	 * @instance
	 * @see {@link GrapplingHook#addHooks} for wrapping asynchronous methods
	 * @see {@link GrapplingHook#addThenableHooks} for wrapping thenable methods
	 * @param {(...String|String[]|...Object|Object[])} methods - method(s) that need(s) to emit `pre` and `post` events
	 * @returns {GrapplingHook}
	 */
	addSyncHooks: function() {
		var config = addHooks(this, _.flatten(_.toArray(arguments)));
		createSyncHooks(this, config);
		return this;
	},

	/**
	 * Wraps thenable methods/functions with `pre` and/or `post` hooks
	 * @since 3.0.0
	 * @instance
	 * @see {@link GrapplingHook#addHooks} for wrapping asynchronous methods
	 * @see {@link GrapplingHook#addSyncHooks} for wrapping synchronous methods
	 * @param {(...String|String[]|...Object|Object[])} methods - method(s) that need(s) to emit `pre` and `post` events
	 * @returns {GrapplingHook}
	 */
	addThenableHooks: function() {
		var config = addHooks(this, _.flatten(_.toArray(arguments)));
		createThenableHooks(this, config);
		return this;
	},

	/**
	 * Calls all middleware subscribed to the asynchronous `qualifiedHook` and passes remaining parameters to them
	 * @instance
	 * @see {@link GrapplingHook#callSyncHook} for calling synchronous hooks
	 * @see {@link GrapplingHook#callThenableHook} for calling thenable hooks
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 * @param {Function} [callback] - will be called when all middleware have finished
	 * @returns {GrapplingHook}
	 */
	callHook: function() {
		//todo: decide whether we should enforce passing a callback
		var params = parseCallHookParams(this, _.toArray(arguments));
		params.done = (_.isFunction(params.args[params.args.length - 1])) ? params.args.pop() : null;
		if(params.done){
			var self = this;
			dezalgofy(function(safeDone) {
				iterateAsyncMiddleware(params.context, self.getMiddleware(params.hook), params.args, safeDone);
			}, params.done);
		}else{
			iterateAsyncMiddleware(params.context, this.getMiddleware(params.hook), params.args);
		}
		return this;
	},

	/**
	 * Calls all middleware subscribed to the synchronous `qualifiedHook` and passes remaining parameters to them
	 * @since 2.4.0
	 * @instance
	 * @see {@link GrapplingHook#callHook} for calling asynchronous hooks
	 * @see {@link GrapplingHook#callThenableHook} for calling thenable hooks
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 * @returns {GrapplingHook}
	 */
	callSyncHook: function() {
		var params = parseCallHookParams(this, _.toArray(arguments));
		iterateSyncMiddleware(params.context, this.getMiddleware(params.hook), params.args);
		return this;
	},

	/**
	 * Calls all middleware subscribed to the synchronous `qualifiedHook` and passes remaining parameters to them
	 * @since 3.0.0
	 * @instance
	 * @see {@link GrapplingHook#callHook} for calling asynchronous hooks
	 * @see {@link GrapplingHook#callSyncHook} for calling synchronous hooks
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} qualifiedHook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 * @returns {thenable} - a thenable, as created with {@link options}.createThenable
	 */
	callThenableHook: function() {
		var params = parseCallHookParams(this, _.toArray(arguments));
		var deferred = {};
		var thenable = this.__grappling.opts.createThenable(function(resolve, reject) {
			deferred.resolve = resolve;
			deferred.reject = reject;
		});
		var self = this;
		dezalgofy(function(safeDone) {
			iterateAsyncMiddleware(params.context, self.getMiddleware(params.hook), params.args, safeDone);
		}, function(err) {
			if (err) {
				return deferred.reject(err);
			}
			return deferred.resolve();
		});
		return thenable;
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
 * alias for {@link GrapplingHook#addHooks}.
 * @since 3.0.0
 * @name GrapplingHook#addAsyncHooks
 * @instance
 * @method
 */
methods.addAsyncHooks = methods.addHooks;
/**
 * alias for {@link GrapplingHook#callHook}.
 * @since 3.0.0
 * @name GrapplingHook#callAsyncHook
 * @instance
 * @method
 */
methods.callAsyncHook = methods.callHook;

/**
 * @module grappling-hook
 * @type {exports|module.exports}
 */
module.exports = {
	/**
	 * Mixes {@link GrapplingHook} methods into `instance`.
	 * @see {@link module:grappling-hook.attach attach} for attaching {@link GrapplingHook} methods to prototypes.
	 * @see {@link module:grappling-hook.create create} for creating {@link GrapplingHook} instances.
	 * @param {Object} instance
	 * @param {string} [presets] - presets name, see {@link module:grappling-hook.set set}
	 * @param {options} [opts] - {@link options}.
	 * @mixes GrapplingHook
	 * @returns {GrapplingHook}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var instance = {
	 * };
	 * grappling.mixin(instance); // add grappling-hook functionality to an existing object
	 */
	mixin: function mixin(instance, presets, opts) {//eslint-disable-line no-unused-vars
		var args = _.toArray(arguments);
		instance = args.shift();
		init.apply(instance, args);
		_.extend(instance, methods);
		return instance;
	},

	/**
	 * Creates an object with {@link GrapplingHook} functionality.
	 * @see {@link module:grappling-hook.attach attach} for attaching {@link GrapplingHook} methods to prototypes.
	 * @see {@link module:grappling-hook.mixin mixin} for mixing {@link GrapplingHook} methods into instances.
	 * @param {string} [presets] - presets name, see {@link module:grappling-hook.set set}
	 * @param {options} [opts] - {@link options}.
	 * @returns {GrapplingHook}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var instance = grappling.create(); // create an instance
	 */
	create: function create(presets, opts) {//eslint-disable-line no-unused-vars
		return module.exports.mixin.apply(null, [{}].concat(_.toArray(arguments)));
	},

	/**
	 * Attaches {@link GrapplingHook} methods to `base`'s `prototype`.
	 * @see {@link module:grappling-hook.create create} for creating {@link GrapplingHook} instances.
	 * @see {@link module:grappling-hook.mixin mixin} for mixing {@link GrapplingHook} methods into instances.
	 * @param {Function} base
	 * @param {string} [presets] - presets name, see {@link module:grappling-hook.set set}
	 * @param {options} [opts] - {@link options}.
	 * @mixes GrapplingHook
	 * @returns {Function}
	 * @example
	 * var grappling = require('grappling-hook');
	 * var MyClass = function() {
	 * };
	 * MyClass.prototype.save = function(done) {
	 *   console.log('save!');
	 *   done();
	 * };
	 * grappling.attach(MyClass); // attach grappling-hook functionality to a 'class'
	 */
	attach: function attach(base, presets, opts) {//eslint-disable-line no-unused-vars
		var args = _.toArray(arguments);
		args.shift();
		var proto = (base.prototype) ? base.prototype : base;
		_.each(methods, function(fn, methodName) {
			proto[methodName] = function() {
				init.apply(this, args);
				_.each(methods, function(fn, methodName) {
					this[methodName] = fn.bind(this);
				}, this);
				return fn.apply(this, _.toArray(arguments));
			};
		});
		return base;
	},

	/**
	 * Store `presets` as `name`. Or set a specific value of a preset.
	 * (The use of namespaces is to avoid the very unlikely case of name conflicts with deduped node_modules)
	 * @since 3.0.0
	 * @see {@link module:grappling-hook.get get} for retrieving presets
	 * @param {string} name
	 * @param {options} options
	 * @returns {module:grappling-hook}
	 * @example
	 * //index.js - declaration
	 * var grappling = require('grappling-hook');
	 * grappling.set('grapplinghook:example', {
	 *   strict: false,
	 *   qualifiers: {
	 *     pre: 'before',
	 *     post: 'after'
	 *   }
	 * });
	 *
	 * //foo.js - usage
	 * var instance = grappling.create('grapplinghook:example'); // uses options as cached for 'grapplinghook:example'
	 * @example
	 * grappling.set('grapplinghook:example.qualifiers.pre', 'first');
	 * grappling.set('grapplinghook:example.qualifiers.post', 'last');
	 */
	set: function(name, options) {
		_.set(presets, name, options);
		return module.exports;
	},

	/**
	 * Retrieves presets stored as `name`. Or a specific value of a preset.
	 * (The use of namespaces is to avoid the very unlikely case of name conflicts with deduped node_modules)
	 * @since 3.0.0
	 * @see {@link module:grappling-hook.set set} for storing presets
	 * @param {string} name
	 * @returns {*}
	 * @example
	 * grappling.get('grapplinghook:example.qualifiers.pre');
	 * @example
	 * grappling.get('grapplinghook:example.qualifiers');
	 * @example
	 * grappling.get('grapplinghook:example');
	 */
	get: function(name) {
		return _.get(presets, name);
	},

	/**
	 * Determines whether `subject` is a {@link thenable}.
	 * @param {*} subject
	 * @returns {Boolean}
	 * @see {@link thenable}
	 */
	isThenable: function isThenable(subject) {
		return subject && subject.then && _.isFunction(subject.then);
	}
};
