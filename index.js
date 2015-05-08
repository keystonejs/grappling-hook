'use strict';

var _ = require('lodash');
var async = require('async');

function init(opts) {
	this.__grappling = {
		middleware: {},
		hooks: [],
		opts: _.defaults({}, opts, {
			strict: true
		})
	};
}

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
 * @api private
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

function iterateMiddleware(context, middleware, args, done) {
	args = args || [];
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
				dezalgo(callback, context, args, next);
				break;
			case 2: //async parallel
				dezalgo(callback, context, args, next, wait(callback));
				break;
			default :
				//synced
				callback.apply(context, args);
				next();
		}
	}, function(err) {
		asyncFinished = (err) ? done : true;
		if (err || !waiting.length) {
			done(err);
		}
	});
}

/**
 *
 * @param hookObj
 * @returns {*}
 * @api private
 */
function qualifyHook(hookObj) {
	if (!hookObj.name || !hookObj.type) {
		throw new Error('Only qualified hooks are allowed, e.g. "pre:save", not "save"');
	}
	return hookObj;
}

function createHooks(instance, config) {
	_.each(config, function(fn, hook) {
		var hookObj = parseHook(hook);
		instance[hookObj.name] = function() {
			var args = _.toArray(arguments);
			var n = args.length - 1;
			var middleware = instance.getMiddleware('pre:' + hookObj.name);
			var callback = _.isFunction(args[n]) ? args.pop() : /* istanbul ignore next: untestable */ null;
			middleware.push(function(next) {
				args.push(next);
				fn.apply(instance, args);
			});
			middleware = middleware.concat(instance.getMiddleware('post:' + hookObj.name));
			dezalgo(iterateMiddleware, null, [instance, middleware, null], callback);
		};
	});
}

var methods = {
	/**
	 * Adds middleware to a pre-hook
	 *
	 * @param {String} action
	 * @param {(...Function|Function[])} fn - middleware to call
	 * @api public
	 */
	pre: function() {
		var args = _.toArray(arguments);
		addMiddleware(this, 'pre:' + args.shift(), args);
		return this;
	},

	/**
	 * Adds middleware to a post-hook
	 *
	 * @param {String} action
	 * @param {(...Function|Function[])} fn - middleware to call
	 * @api public
	 */
	post: function() {
		var args = _.toArray(arguments);
		addMiddleware(this, 'post:' + args.shift(), args);
		return this;
	},

	/**
	 * Adds middleware to a hook
	 *
	 * @param {String} hook - qualified hook e.g. `pre:save`
	 * @param {(...Function|Function[])} fn - middleware to call
	 * @api public
	 */
	hook: function() {
		var args = _.toArray(arguments);
		qualifyHook(parseHook(args[0]));
		addMiddleware(this, args.shift(), args);
		return this;
	},

	/**
	 * Removes (a) hook(s) for `hook`
	 * @example
	 * //removes `onFieldSave` as a `pre:save` middleware
	 * field.unhook( 'pre:save', onFieldSave );
	 * @example
	 * //removes all middleware for `pre:save`
	 * field.unhook('pre:save');
	 * @example
	 * //removes all middleware for `pre:save` and `post:save`
	 * field.unhook('save');
	 * @example
	 * //removes ALL middleware
	 * field.unhook();
	 * @param {String} [hook] - (qualified) hooks e.g. `pre:save` or `save`
	 * @param {(...Function|Function[])} [fn] - function(s) to be removed
	 */
	unhook: function() {
		var fns = _.toArray(arguments);
		var hook = fns.shift();
		var hookObj = parseHook(hook);
		var middleware = this.__grappling.middleware;
		if (hookObj.type || fns.length) {
			qualifyHook(hookObj);
			if (middleware[hook]) middleware[hook] = (fns.length ) ? _.without.apply(null, [middleware[hook]].concat(fns)) : [];
		} else if (hookObj.name) {
			/* istanbul ignore else: nothing _should_ happen */
			if (middleware['pre:' + hookObj.name]) middleware['pre:' + hookObj.name] = [];
			/* istanbul ignore else: nothing _should_ happen */
			if (middleware['post:' + hookObj.name]) middleware['post:' + hookObj.name] = [];
		} else {
			_.each(middleware, function(callbacks, hook) {
				middleware[hook] = [];
			});
		}
		return this;
	},

	hookable: function(hook) {
		qualifyHook(parseHook(hook));
		return (this.__grappling.opts.strict) ? !!this.__grappling.middleware[hook] : true;
	},

	/**
	 * Explicitly declare hooks
	 * @param {(...string|string[])} hooks - (qualified) hooks e.g. `pre:save` or `save`
	 */
	allowHooks: function() {
		var args = _.flatten(_.toArray(arguments));
		_.each(args, function(hook) {
			if (!_.isString(hook)) {
				throw new Error('`allowHooks` expects (arrays of) Strings');
			}
			var hookObj = parseHook(hook);
			var middleware = this.__grappling.middleware;
			if (hookObj.type) {
				if (hookObj.type !== 'pre' && hookObj.type !== 'post') {
					throw new Error('Only "pre" and "post" types are allowed, not "' + hookObj.type + '"');
				}
				middleware[hook] = middleware[hook] || [];
			} else {
				middleware['pre:' + hookObj.name] = middleware['pre:' + hookObj.name] || [];
				middleware['post:' + hookObj.name] = middleware['post:' + hookObj.name] || [];
			}
		}, this);
		return this;
	},

	/**
	 * Wraps methods/functions with `pre` and/or `post` hooks
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
	 * @param {(...String|String[]|...Object|Object[])} method - method(s) that need(s) to emit `pre` and `post` events
	 */
	addHooks: function() {
		var args = _.flatten(_.toArray(arguments));
		var config = {};
		_.each(args, function(mixed) {
			if (_.isString(mixed)) {
				var hookObj = parseHook(mixed);
				var fn = this[hookObj.name];
				if (!fn) throw new Error('Cannot add hooks to undeclared method:"' + hookObj.name + '"'); //non-existing method
				config[mixed] = fn;
			} else if (_.isObject(mixed)) {
				_.defaults(config, mixed);
			} else {
				throw new Error('`addHooks` expects (arrays of) Strings or Objects');
			}
		}, this);
		this.allowHooks(_.keys(config));
		createHooks(this, config);
		return this;
	},

	/**
	 * Calls all middleware subscribed to the `hook` and passes remaining parameters to them
	 * @param {*} [context] - the context in which the middleware will be called
	 * @param {String} hook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the middleware.
	 * @param {Function} [callback] - will be called when all middleware have finished
	 */
	callHook: function(context, hook) {
		var args = _.toArray(arguments);
		var done;
		if (_.isString(context)) {
			hook = context;
			context = this;
		} else {
			args.shift(); //drop `context`
		}
		args.shift();//drop `hook`
		if (_.isFunction(args[args.length - 1])) {
			done = args.pop(); //drop callback
		}
		args = _.flatten(args);// in case parameters were passed in as an array; this is 2-dim, we need 1-dim
		dezalgo(iterateMiddleware, null, [context, this.getMiddleware(hook), args], done);
		return this;
	},

	/**
	 *
	 * @param hook - qualified hook, e.g. `pre:save`
	 * @returns {Function[]}
	 */
	getMiddleware: function(hook) {
		qualifyHook(parseHook(hook));
		var middleware = this.__grappling.middleware[hook];
		if (middleware) {
			return middleware.slice(0);
		}
		return [];
	},

	/**
	 *
	 * @param hook - qualified hook, e.g. `pre:save`
	 * @returns {boolean}
	 */
	hasMiddleware: function(hook) {
		return this.getMiddleware(hook).length > 0;
	}
};

function mixin(instance, opts) {
	init.call(instance, opts);
	_.extend(instance, methods);
	return instance;
}

function attach(clazz, opts) {
	mixin(clazz.prototype, opts);
	return clazz;
}

/**
 *
 * @param {Object} [opts]
 * @param {Boolean} [opts.strict=true] - Will disallow subscribing to middleware bar the explicitly registered ones.
 * @returns {*}
 */
function create(opts) {
	return mixin({}, opts);
}

module.exports = {
	mixin: mixin,
	create: create,
	attach: attach
};
