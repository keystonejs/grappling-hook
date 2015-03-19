'use strict';

var _ = require('lodash'),
	di = require('asyncdi'),
	async = require('async');

function init(opts) {
	this.__grappling = {
		middleware: {},
		hooks     : [],
		opts      : _.defaults({}, opts, {
			strict: true
		})
	};
}

function parseHook(hook) {
	var parsed = (hook) ? hook.split(':') : [],
		n = parsed.length;
	return {
		type: parsed[n - 2],
		name: parsed[n - 1]
	};
}

/**
 * Applies `iteratee` to all subscribed hooks.
 * @param {*} [context] - the context in which `iteratee` will be called
 * @param {String} hook - (qualified) hook, e.g. 'pre:save' or 'save'
 * @param {Function} iteratee - the function the middleware is passed to
 * @param {Function} [done] - will be called when all hooks have been called
 * @api private
 */
function iterateMiddleware(instance) {
	var args = _.toArray(arguments);
	args.shift(); // drop `instance`
	if (_.isString(args[0])) {
		args.unshift(null);
	}
	async.eachSeries(instance.getMiddleware(args[1]), args[2].bind(args[0]), args[3]);
	return this;
}

/**
 *
 * @param instance grappling-hook instance
 * @param hookType qualifier
 * @param hookName action
 * @param args
 * @api private
 */
function addMiddleware(instance, hookType, hookName, args) {
	var fn = _.flatten(args),
		cache = instance.__grappling;
	if (cache.opts.strict && cache.hooks.indexOf(hookType + ':' + hookName) < 0) {
		throw new Error('Hooks for ' + hookType + ':' + hookName + ' are not supported.');
	}
	var mw = cache.middleware[hookName] || {};
	mw[hookType] = (mw[hookType] || []).concat(fn);
	cache.middleware[hookName] = mw;
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
	var registered = instance.__grappling.hooks;
	_.each(config, function(fn, hook) {
		var hookObj = parseHook(hook);
		instance[hookObj.name] = function() {
			if(registered.indexOf('pre:' + hookObj.name) > -1){
				instance.callHook('pre:' + hookObj.name);
			}
			fn.apply(instance, _.toArray(arguments));
			if(registered.indexOf('post:' + hookObj.name) > -1){
				instance.callHook('post:' + hookObj.name);
			}
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
		addMiddleware(this, 'pre', args.shift(), args);
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
		addMiddleware(this, 'post', args.shift(), args);
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
		var args = _.toArray(arguments),
			hook = qualifyHook(parseHook(args[0]));
		args[0] = hook.name;
		this[hook.type].apply(this, args);
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
		var fns = _.toArray(arguments),
			hook = parseHook(fns.shift()),
			cache = this.__grappling.middleware[hook.name];

		if (fns.length) {
			qualifyHook(hook);
		}
		if (cache) {
			if (hook.type) {
				cache[hook.type] = (fns.length) ? _.without.apply(null, [cache[hook.type]].concat(fns)) : [];
			} else {
				this.__grappling.middleware[hook.name] = {pre: [], post: []};
			}
		}else if(!hook.name){
			this.__grappling.middleware = {};
		}
		return this;
	},

	/**
	 * Explicitly declare hooks
	 * @param {(...string|string[])} hooks - (qualified) hooks e.g. `pre:save` or `save`
	 */
	allowHooks: function() {
		var args = _.flatten(_.toArray(arguments));
		_.each(args, function(hook) {
			var hookObj = parseHook(hook),
				hooks;
			if (hookObj.type) {
				if (hookObj.type !== 'pre' && hookObj.type !== 'post') {
					throw new Error('Only "pre" and "post" types are allowed, not "' + hookObj.type + '"');
				}
				hooks = [hook];
			} else {
				hooks = ['pre:' + hookObj.name, 'post:' + hookObj.name];
			}
			this.__grappling.hooks = this.__grappling.hooks.concat(hooks);
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
		var args = _.flatten(_.toArray(arguments)),
			config = {};
		_.each(args, function(mixed) {
			if (_.isString(mixed)) {
				var hookObj = parseHook(mixed),
					fn = this[hookObj.name];
				if (!fn) throw new Error('todo'); //non-existing method
				config[mixed] = fn;
			} else if (_.isObject(mixed)) {
				_.defaults(config, mixed);
			}// todo: else throw?
		}, this);
		this.allowHooks(_.keys(config));
		createHooks(this, config);
		return this;
	},

	/**
	 * Calls all hooks subscribed to the `hook` and passes remaining parameters to them
	 * @param {*} [context] - the context in which the hooks will be called
	 * @param {String} hook - qualified hook e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the hooks.
	 * @param {Function} [callback] - will be called when all hooks have finished
	 */
	callHook: function(context, hook) {
		var args = _.toArray(arguments),
			done;
		if (_.isString(context)) {
			hook = context;
			context = null;
		} else {
			args.shift(); //drop `context`
		}
		args.shift();//drop `hook`
		if (_.isFunction(args[args.length - 1])) {
			done = args.pop(); //drop callback
		}
		args = _.flatten(args);// in case parameters were passed in as an array; this is 2-dim, we need 1-dim
		iterateMiddleware(this, hook, function(callback, next) {
			di(callback, context, {callback: ['next', 'callback']}).provides(args).call(function() {
				next();
			});
		}, done);
		return this;
	},

	/**
	 *
	 * @param hook - qualified hook, e.g. `pre:save`
	 * @returns {Function[]}
	 */
	getMiddleware: function(hook) {
		var hookObj = qualifyHook(parseHook(hook));
		return (this.__grappling.middleware[hookObj.name] || {})[hookObj.type] || [];
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
	return mixin(clazz.prototype, opts);
}

/**
 *
 * @param {Object} [opts]
 * @param {Boolean} [opts.strict=true] - Will disallow subscribing to hooks bar the explicitly registered ones.
 * @returns {*}
 */
function create(opts) {
	return mixin({}, opts);
}

module.exports = {
	mixin : mixin,
	create: create,
	attach: attach
};
