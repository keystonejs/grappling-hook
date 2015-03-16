'use strict';

var _ = require('lodash'),
	di = require('asyncdi'),
	async = require('async');

function init(opts) {
	this.__hooks = {
		pre      : {},
		post     : {},
		originals: {},
		opts     : opts || {}
	};
}

function addHook(context, eventType, args) {
	var eventName = args.shift(),
		fn = _.flatten(args);
	if (!context.__hooks[eventType][eventName] && context.__hooks.opts.strict) {
		throw new Error('Hooks for ' + eventName + ' are not supported.');
	}
	var handlers = context.__hooks[eventType];
	handlers[eventName] = handlers[eventName].concat(fn);
}

function parseTypedEvent(typedEvent) {
	var temp = typedEvent.split(':');
	return {
		type: temp[0],
		name: temp[1]
	};
}
var methods = {
	/**
	 * Sets up a pre-hook.
	 *
	 * @param {String} event
	 * @param {(...Function|Function[])} fn - function(s) to call
	 * @api public
	 */
	pre: function() {
		addHook(this, 'pre', _.toArray(arguments));
		return this;
	},

	/**
	 * Sets up a post-hook.
	 *
	 * @param {String} event
	 * @param {(...Function|Function[])} fn - function(s) to call
	 * @api public
	 */
	post: function() {
		addHook(this, 'post', _.toArray(arguments));
		return this;
	},

	/**
	 * Sets up a hook.
	 *
	 * @param {String} typedEvent namespaced event, e.g. `pre:save`
	 * @param {(...Function|Function[])} fn - function(s) to call
	 * @api public
	 */
	hookup: function(typedEvent) {
		var event = parseTypedEvent(typedEvent),
			args = _.toArray(arguments);
		args[0] = event.name;
		this[event.type].apply(this, args);
		return this;
	},

	/**
	 * Registers a hookable type
	 * @param {(...string|string[])} types - namespaced event(s), e.g. `pre:save`
	 * or simply passing `save` will register both `pre:save` and `post:save`
	 */
	hookable: function() {
		var args = _.flatten(_.toArray(arguments));
		_.each(args, function(typedEvent) {
			var event = parseTypedEvent(typedEvent);
			if (!this.__hooks[event.type]) {
				if (event.name) {
					throw new Error('Only "pre" and "post" types are allowed, not "' + event.type + '"');
				} else {
					this.__hooks.pre[event.type] = [];
					this.__hooks.post[event.type] = [];
				}
			} else {
				this.__hooks[event.type][event.name] = [];
			}
		}, this);
		return this;
	},

	/**
	 * Applies `iteratee` to all subscribed hooks.
	 * @param {*} [context] - the context in which `iteratee` will be called
	 * @param {String} typedEvent - namespaced event, e.g. `pre:save`
	 * @param {Function} iteratee - the function to apply to the hooks
	 * @param {Function} [done] - will be called when all hooks have been called
	 */
	hooks: function() {
		var args = _.toArray(arguments);
		if (_.isString(args[0])) {
			args.unshift(null);
		}
		var event = parseTypedEvent(args[1]);
		async.eachSeries(this.__hooks[event.type][event.name], args[2].bind(args[0]), args[3]);
		return this;
	},

	/**
	 * Calls all hooks subscribed to the `typedEvent` and passes remaining parameters to them
	 * @param {*} [context] - the context in which the hooks will be called
	 * @param {String} typedEvent - namespaced event, e.g. `pre:save`
	 * @param {...*} [parameters] - any parameters you wish to pass to the hooks.
	 * @param {Function} [callback] - will be called when all hooks have finished
	 */
	emit: function(context, typedEvent) {
		var args = _.toArray(arguments),
			done;
		if (_.isString(context)) {
			typedEvent = context;
			context = null;
		} else {
			args.shift(); //drop `context`
		}
		args.shift();//drop `typedEvent`
		if (_.isFunction(args[args.length - 1])) {
			done = args.pop(); //drop callback
		}
		args = _.flatten(args);// in case parameters were passed in as an array; this is 2-dim, we need 1-dim
		this.hooks(typedEvent, function(hook, next) {
			di(hook, context, {callbackParamName: 'next'}).provides(args).call(function() {
				next();
			});
		}, done);
		return this;
	},

	/**
	 * Removes (a) hook(s) for `typedEvent`
	 * @example
	 * //removes `onFieldSave` as a `pre:save` hook
	 * field.unhook( 'pre:save', onFieldSave );
	 * @example
	 * //removes ALL hooks for `pre:save`
	 * field.unhook('pre:save');
	 * @example
	 * //removes ALL `pre` hooks
	 * field.unhook('pre');
	 * @example
	 * //removes ALL hooks, i.e. `pre` AND `post`
	 * field.unhook();
	 * @param {String} [typedEvent] - namespaced event, e.g. `pre:save`
	 * @param {(...Function|Function[])} [fn] - function(s) to be removed
	 */
	unhook: function() {
		var methods = _.toArray(arguments);
		var event = parseTypedEvent(methods.shift());
		if (methods.length) {
			_.remove(this.__hooks[event.type][event.name], function(hook) {
				return methods.indexOf(hook) > -1;
			}, this);
		} else {
			if (event.name) {
				delete this.__hooks[event.type][event.name];
			} else {
				this.__hooks[event.type] = {};
			}
		}
		return this;
	},

	/**
	 * Wraps `method` with `pre` and `post` emission
	 * @example
	 * field.hooked('save');
	 * field.pre('save', function(){
	 *   console.log('pre:save called');
	 * });
	 * field.save();
	 * @param {(...String|String[])} method - method(s) that need(s) to emit `pre` and `post` events
	 */
	hooked: function() {
		var methods = _.flatten(_.toArray(arguments));
		_.each(methods, function(method) {
			this.hookable(method);
			this.__hooks.originals[method] = this[method];
			this[method] = function() {
				this.emit('pre:' + method);
				this.__hooks.originals[method].apply(this, _.toArray(arguments));
				this.emit('post:' + method);
			}.bind(this);
		}, this);
		return this;
	}
};

function mixin(instance, opts) {
	init.call(instance, opts);
	_.extend(instance, methods);
	return instance;
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
	create: create
};
