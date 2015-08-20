# grappling-hook
[![Build Status](https://travis-ci.org/keystonejs/grappling-hook.svg)](https://travis-ci.org/keystonejs/grappling-hook)
[![npm version](https://badge.fury.io/js/grappling-hook.svg)](http://npmjs.org/packages/grappling-hook)
[![Coverage Status](https://coveralls.io/repos/keystonejs/grappling-hook/badge.svg?branch=master)](https://coveralls.io/r/keystonejs/grappling-hook?branch=master)

>pre/post hooking enabler

`grappling-hook` allows you to add pre/post hooks to objects and prototypes.
A number of modules already exist that allow you to do just the same, but the most popular one ([hooks](https://www.npmjs.com/package/hooks)) is no longer maintained.
Also, we wanted a more granular control of the hooking process and the way middleware is called.

**NEW:**

* since v3.0 you can [use promises as middleware][thenable-middleware] and have [thenable hooks][thenable-hooks] (i.e. promise returning hooks).
* since v2.4 you can [wrap sync methods and call sync hooks][synchronous-hooks].
* since v2.3 you can [configure `grappling-hook` to use other method names][other-qualifiers] than `pre` or `post`, e.g. `before` and `after`.

## Installation

```sh
$ npm install grappling-hook
```

## Usage

From here on `grappling-hook` refers to the module itself (i.e. what you get when you `require('grappling-hook')`) and `GrapplingHook` refers to any GrapplingHook object (i.e. an object which allows you to register `pre` and `post` middleware, et cetera)

`grappling-hook` and `GrapplingHook` expose two different API's:

1. a consumer-facing API, i.e. it allows you to add middleware functions to pre/post hooks.
1. a producer-facing API, i.e. it allows you to create hooks, wrap methods with hooks, et cetera.

### Consumer-facing API

Allows you to add/remove [middleware][middleware] functions to hooks. There's 4 types of middleware possible:

#### synchronous middleware

i.e. the function is executed and the next middleware function in queue will be called immediately.

```js
function () { //no callbacks
	//synchronous execution
}
```

#### serially (a)synchronous middleware

i.e. the next middleware function in queue will be called once the current middleware function finishes its (asynchronous) execution.

```js
function (next) { //a single callback
	//asynchronous execution, i.e. further execution is halted until `next` is called.
	setTimeout(next, 1000);
}
```

#### parallel (a)synchronous middleware

i.e. the next middleware function in queue will be called once the current middleware function signals it, however the whole queue will only be finished once the current middleware function has completed its (a)synchronous execution.

```js
function (next, done) { //two callbacks
	//asynchronous execution, i.e. further execution is halted until `next` is called.
	setTimeout(next, 500);
	//full middleware queue handling is halted until `done` is called.
	setTimeout(done, 1000);
}
```

#### thenable middleware (promises)

i.e. the next middleware function in queue will be called once the [thenable][thenable] middleware function has resolved its promise.

```js
function () { //no callbacks
	//create promise, i.e. further execution is halted until the promise is resolved.
	return promise
}
```

(Sidenote: all consumer-facing methods exist out of a single word)

See:

* [GrapplingHook#pre][GrapplingHook#pre] on how to register [middleware][middleware] functions to `pre` hooks.
* [GrapplingHook#post][GrapplingHook#post] on how to register [middleware][middleware] functions to `post` hooks.
* [GrapplingHook#hook][GrapplingHook#hook] on how to register [middleware][middleware] functions to `pre` or `post` hooks.

All three allow you to register middleware functions by either passing them as parameters to the method:

```js
instance.pre('save', notifyUser, checkPermissions, doSomethingElseVeryImportant);
```

Or (if the grappling-hook instances are [setup for thenables][setup-thenables]) by chaining them with `then`:

```js
instance.pre('save')
	.then(notifyUser)
	.then(checkPermissions)
	.then(doSomethingElseVeryImportant)
```

Additionally see:

* [GrapplingHook#unhook][GrapplingHook#unhook] on how to deregister [middleware][middleware] functions from hooks.
* [GrapplingHook#hookable][GrapplingHook#hookable] on how to check whether a hook is available.

### Producer-facing API

`grappling-hook` provides you with methods to store, retrieve and reuse presets.

* [grappling-hook.set][grappling-hook.set] on how to store presets.
* [grappling-hook.get][grappling-hook.get] on how to view presets.

All `grappling-hook` factory functions allow you to reuse presets, see [presets example](#presets).

See:

* [grappling-hook.create][grappling-hook.create] on how to create vanilla `GrapplingHook` objects.
* [grappling-hook.mixin][grappling-hook.mixin] on how to add `GrapplingHook` functionality to existing objects.
* [grappling-hook.attach][grappling-hook.attach] on how to add `GrapplingHook` functionality to constructors.

By default `GrapplingHook` hooks need to be either explicitly declared with [GrapplingHook#allowHooks][GrapplingHook#allowHooks] if you want to call your hooks directly or by wrapping existing methods.

`GrapplingHook` objects can have 3 kinds of hooks:

#### Asynchronous hooks

Asynchronous hooks **require** a callback as the final parameter. It will be called once all pre _and_ post middleware has finished. When using a wrapped method, the original (unwrapped) method will be called in between the pre and post middleware.

Asynchronous hooks _always_ finish asynchronously, i.e. even if only synchronous middleware has been registered to a hook `callback` will always be called asynchronously (next tick at the earliest).

Middleware added to asynchronous hooks can be synchronous, serially asynchronous, parallel asynchronous or thenable. See [middleware][middleware] for more information.

See:

* [GrapplingHook#addHooks][GrapplingHook#addHooks] or its alias [GrapplingHook#addAsyncHooks][GrapplingHook#addAsyncHooks] on how to wrap asynchronous methods with pre/post hooks.
* [GrapplingHook#callHook][GrapplingHook#callHook] or its alias [GrapplingHook#callAsyncHook][GrapplingHook#callAsyncHook] on how to call an asynchronous pre or post hook directly.

#### Synchronous hooks

Synchronous hooks do not require a callback and allow the possibility to return values from wrapped methods.

They _always_ finish synchronously, which means consumers are not allowed to register any asynchronous middleware (including thenables) to synchronous hooks.

See:

* [GrapplingHook#addSyncHooks][GrapplingHook#addSyncHooks] on how to wrap synchronous methods with pre/post hooks.
* [GrapplingHook#callSyncHook][GrapplingHook#callSyncHook] on how to call a synchronous pre or post hook directly.

#### Thenable hooks

Thenable hooks **must** return a promise.

They _always_ finish asynchronously, i.e. even if only synchronous middleware has been registered to a thenable hook the promise will be resolved asynchronously.

Middleware added to thenable hooks can be synchronous, serially asynchronous, parallel asynchronous or thenable. See [middleware][middleware] for more information.

See:

* [GrapplingHook#addThenableHooks][GrapplingHook#addThenableHooks] on how to wrap thenable methods with pre/post hooks.
* [GrapplingHook#callThenableHook][GrapplingHook#callThenableHook] on how to call a thenable pre or post hook directly.

In order to create thenable hooks `grappling-hook` must be properly [setup for creating thenables][setup-thenables].


### Introspection

You can check if a hook has middleware registered with [GrapplingHook#hasMiddleware][GrapplingHook#hasMiddleware] or you can even access the raw middleware functions through [GrapplingHook#getMiddleware][GrapplingHook#getMiddleware].

## Examples

### mix middleware types

You can **mix sync/async serial/parallel and thenable middleware** any way you choose (for aynchronous and thenable hooks):

```js
instance.pre('save', function (next) {
	//async serial
	console.log('async serial: setup');
	setTimeout(function () {
		console.log('async serial: done');
		next();
	}, 100);
}, function () {
	//sync
	console.log('sync: done');
}, function (next, done) {
	//async parallel
	console.log('async parallel: setup');
	setTimeout(function () {
		console.log('async parallel: done');
		done();
	}, 200);
	next();
}, function () {
	//thenable
	console.log('thenable: setup');
	var done;
	var promise = new P(function (resolve, fail) {
		done = resolve;
	});
	setTimeout(function () {
		console.log('thenable: done');
		done();
	}, 30);
	return promise;
});
```
```sh
# output
async serial: setup
async serial: done
sync: done
async parallel: setup
thenable: setup
thenable: done
async parallel: done
```

### Creating a `GrapplingHook` object

You can easily add methods to a new `grappling-hook` instance which are automatically ready for hooking up middleware:

```js
var grappling = require('grappling-hook');

// create an instance
var instance = grappling.create();

// declare the hookable methods
instance.addHooks({
	save: function (done) {
		console.log('save!');
		done();
	}
});

//allow middleware to be registered for a hook
instance.pre('save', function () {
	console.log('saving!');
}).post('save', function () {
	console.log('saved!');
});

instance.save(function (err) {
	console.log('All done!!');
});
```
```sh
# output:
saving!
save!
saved!
All done!!
```

### Using an existing object

You can choose to enable hooking for an already existing object with methods:

```js
var grappling = require('grappling-hook');

var instance = {
	save: function (done) {
		console.log('save!');
		done();
	}
};

grappling.mixin(instance); // add grappling-hook functionality to an existing object

instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function () {
	console.log('saving!');
}).post('save', function () {
	console.log('saved!');
});

instance.save(function (err) {
	console.log('All done!!');
});

```
```sh
# output:
saving!
save!
saved!
All done!!
```

### Using a 'class'

You can patch a `prototype` with `grappling-hook` methods:

```js
var grappling = require('grappling-hook');

var MyClass = function () {};

MyClass.prototype.save = function (done) {
	console.log('save!');
	done();
};

grappling.attach(MyClass); // attach grappling-hook functionality to a 'class'

var instance = new MyClass();
instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function () {
	console.log('saving!');
}).post('save', function () {
	console.log('saved!');
});

instance.save(function (err) {
	console.log('All done!!');
});
```
```sh
# output:
saving!
save!
saved!
All done!!
```

### Adding hooks to synchronous methods

`addSyncHooks` allows you to register methods for enforced synchronized middleware execution:

```js
var grappling = require('grappling-hook');

var instance = {
	saveSync: function (filename) {
		filename = Date.now() + '-' + filename;
		console.log('save', filename);
		return filename;
	}
};

grappling.mixin(instance); // add grappling-hook functionality to an existing object

instance.addSyncHooks('saveSync'); // setup hooking for an existing (sync) method

instance.pre('saveSync', function () {
	console.log('saving!');
}).post('saveSync', function () {
	console.log('saved!');
});

var newName = instance.saveSync('example.txt');
console.log('new name:', newName);
```
```sh
# output:
saving!
save 1431264587725-example.txt
saved!
new name: 1431264587725-example.txt
```

### Passing parameters

You can pass any number of parameters to your middleware:

```js
instance.pre('save', function (foo, bar) {
	console.log('saving!', foo, bar);
});

instance.callHook('pre:save', 'foo', { bar: 'bar'}, function () {
	console.log('done!');
});
```
```sh
# output:
saving! foo { bar: 'bar' }
done!
```

```js
instance.save = function (filename, dir, done) {
	// do your magic
	done();
}

instance.pre('save', function (filename, dir) {
	console.log('saving!', filename, dir);
});

instance.save('README.md', 'docs');
```
```sh
# output:
saving! README.md docs
```

### Contexts

By default all middleware is called with the `GrapplingHook` instance as an execution context, e.g.:

```js
instance.pre('save', function () {
	console.log(this);
});

instance.toString = function () {
	return "That's me!!";
};
instance.callSyncHook('pre:save');
```
```sh
# output:
That's me!!
```

However, `callHook`, `callSyncHook` and `callThenableHook` accept a `context` parameter to change the scope:

```js
instance.pre('save', function () {
	console.log(this);
});

instance.toString = function () {
	return "That's me!!";
};

var context = {
	toString: function () {
		return 'Different context!';
	}
};
instance.callSyncHook(context, 'pre:save'); // the `context` goes first
```
```sh
# output:
Different context!
All done!!
```

### Lenient mode

By default `grappling-hook` throws errors if you try to add middleware to or call a non-existing hook. However if you want to allow more leeway (for instance for dynamic delegated hook registration) you can turn on lenient mode:

```js
var instance = grappling.create({
	strict: false
});
```

### Other qualifiers

By default `grappling-hook` registers `pre` and `post` methods, but you can configure other names if you want:

```js
var instance = grappling.create({
	qualifiers: {
		pre: 'before',
		post: 'after'
	}
});

//now use `before` and `after` instead of `pre` and `post`:

instance.addHooks('save');
instance.before('save', fn);
instance.after('save', fn);
instance.save();
```

There's one caveat: you _have_ to configure both or none.

### Setting up thenable hooks

If you want to use thenable hooks, you'll need to provide `grappling-hook` with a thenable factory function, since it's promise library agnostic (i.e. you can use it with any promise library you want).

Just to be clear: you do NOT need to provide a thenable factory function in order to allow thenable middleware, this works out of the box.

```js
var P = require('bluebird');

var instance = grappling.create({
	createThenable: function (fn) {
		return new P(fn);
	}
})

instance.addThenableHooks({
	save: function (filename) {
		var p = new P(function (resolve, reject) {
			// add code for saving
		});
		return p;
	}
});

instance.save('examples.txt').then(function () {
	console.log('Finished!');
});
```

### Error handling

- Errors thrown in middleware registered to synchronized hooks will bubble through

	```js
	instance.pre('save', function () {
		throw new Error('Oh noes!');
	});
	instance.callSyncHook('pre:save');
	```
	```sh
	# output:
	Error: Oh noes!
	```

- Errors thrown in middleware registered to asynchronous hooks are available as the `err` object in the `callback`.

	```js
	instance.pre('save', function () {
		throw new Error('Oh noes!');
	});
	instance.callHook('pre:save', function (err) {
		console.log('Error occurred:', err);
	});
	```
	```sh
	# output:
	Error occurred: Error: Oh noes!
	```

- Errors thrown in middleware registered to thenable hooks trigger the promise's rejectedHandler.

	```js
	instance.pre('save', function () {
		throw new Error('Oh noes!');
	});
	instance.callThenableHook('pre:save').then(null, function (err) {
		console.log('Error occurred:', err);
	});
	```
	```sh
	# output:
	Error occurred: Error: Oh noes!
	```

- Async middleware can pass errors to their `next` (serial or parallel) or `done` (parallel only) callbacks, which will be passed as the `err` object parameter for asynchronous hooks:

	```js
	//async serial
	instance.pre('save', function (next) {
		next(new Error('Oh noes!'));
	});
	```
	```js
	//async parallel
	instance.pre('save', function (next, done) {
		next();
		done(new Error('Oh noes!'));
	});
	```
	```js
	instance.callHook('pre:save', function (err) {
		if (err) {
			console.log('An error occurred:', err);
		}
	});
	```
	```sh
	# output for both:
	An error occurred: Oh noes!
	```
- Async middleware can pass errors to their `next` (serial or parallel) or `done` (parallel only) callbacks, which will trigger the rejectedHandler of thenable hooks:

	```js
	//async serial
	instance.pre('save', function (next) {
		next(new Error('Oh noes!'));
	});
	```
	```js
	//async parallel
	instance.pre('save', function (next, done) {
		next();
		done(new Error('Oh noes!'));
	});
	```
	```js
	instance.callThenableHook('pre:save').then(null, function (err) {
		if (err) {
			console.log('An error occurred:', err);
		}
	});
	```
	```sh
	# output for both:
	An error occurred: Oh noes!
	```

- Thenable middleware can reject their promises, which will be passed as the `err` object parameter for asynchronous hooks:

	```js
	instance.pre('save', function (next) {
		var p = new Promise(function (succeed, fail) {
			fail('Oh noes!');
		});
		return p;
	});
	```
	```js
	instance.callHook('pre:save', function (err) {
		if (err) {
			console.log('An error occurred:', err);
		}
	});
	```
	```sh
	# output:
	An error occurred: Oh noes!
	```
- Thenable middleware can reject their promises, which will trigger the rejectedHandler of thenable hooks:

	```js
	instance.pre('save', function (next) {
		var p = new Promise(function (succeed, fail) {
			fail('Oh noes!');
		});
		return p;
	});
	```
	```js
	instance.callThenableHook('pre:save').then(null, function (err) {
		if (err) {
			console.log('An error occurred:', err);
		}
	});
	```
	```sh
	# output for both:
	An error occurred: Oh noes!
	```

### Presets

You can [set][grappling-hook.set] and use preset configurations, in order to reuse them in your project.

```js
var presets = {
	strict: false,
	qualifiers: {
		pre: 'before',
		post: 'after'
	}
};
var grappling = require('grappling-hook');
grappling.set('grappling-hook:examples.presets', presets);

//all grappling-hook factory methods accept a presetname:
var instance = grappling.create('grappling-hook:examples.presets');

instance.addSyncHooks({
	save: function () {
		console.log('Saving!');
	}
});

instance.before('save', function () {
	console.log('Before save!');
}).after('save', function () {
	console.log('After save!');
}).save();
```
```sh
# output:
Before save!
Saving!
After save!
```

If you want to override preset configuration options, just pass them to the factory function, as always:

```js
var instance = grappling.create('grappling-hook:examples.presets', {
	strict: true
});

/*
instance has the following configuration:
{
	strict: true,
	qualifiers: {
		pre: 'before',
		post: 'after'
	}
}
*/
```

With [grappling-hook.get][grappling-hook.get] you can introspect the configuration options of a preset:

```js
console.log(grappling.get('grappling-hook:examples.presets'));
```
```sh
# output:
{
	strict: false,
	qualifiers: {
		pre: 'before',
		post: 'after'
	}
}
```

[middleware]: https://keystonejs.github.io/grappling-hook/global.html#middleware
[thenable]: https://keystonejs.github.io/grappling-hook/global.html#thenable
[grappling-hook.get]: https://keystonejs.github.io/grappling-hook/module-grappling-hook.html#.get
[grappling-hook.set]: https://keystonejs.github.io/grappling-hook/module-grappling-hook.html#.set
[grappling-hook.create]: https://keystonejs.github.io/grappling-hook/module-grappling-hook.html#.create
[grappling-hook.mixin]: https://keystonejs.github.io/grappling-hook/module-grappling-hook.html#.mixin
[grappling-hook.attach]: https://keystonejs.github.io/grappling-hook/module-grappling-hook.html#.attach
[GrapplingHook#pre]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#pre
[GrapplingHook#post]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#post
[GrapplingHook#hook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#hook
[GrapplingHook#unhook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#unhook
[GrapplingHook#hookable]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#hookable
[GrapplingHook#allowHooks]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#allowHooks
[GrapplingHook#addHooks]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#addHooks
[GrapplingHook#addAsyncHooks]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#addAsyncHooks
[GrapplingHook#addSyncHooks]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#addSyncHooks
[GrapplingHook#addThenableHooks]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#addThenableHooks
[GrapplingHook#callHook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#callHook
[GrapplingHook#callAsyncHook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#callAsyncHook
[GrapplingHook#callSyncHook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#callSyncHook
[GrapplingHook#callThenableHook]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#callThenableHook
[GrapplingHook#hasMiddleware]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#hasMiddleware
[GrapplingHook#getMiddleware]: https://keystonejs.github.io/grappling-hook/GrapplingHook.html#getMiddleware

[other-qualifiers]: #other-qualifiers
[synchronous-hooks]: #synchronous-hooks
[setup-thenables]: #setting-up-thenable-hooks
[thenable-middleware]: #thenable-middleware-promises
[thenable-hooks]: #thenable-hooks

## Changelog

See [History.md](https://github.com/keystonejs/grappling-hook/blob/master/History.md)

## Contributing

Pull requests welcome. Make sure you use the .editorconfig in your IDE of choice and please adhere to the coding style as defined in .eslintrc.

* `npm test` for running the tests
* `npm run lint` for running eslint
* `npm run test-cov` for churning out test coverage. (We go for 100% here!)
* `npm run docs` for generating the API docs
