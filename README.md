# grappling-hook
[![Build Status](https://travis-ci.org/keystonejs/grappling-hook.svg)](https://travis-ci.org/keystonejs/grappling-hook)
[![npm version](https://badge.fury.io/js/grappling-hook.svg)](http://npmjs.org/packages/grappling-hook)
[![Coverage Status](https://coveralls.io/repos/keystonejs/grappling-hook/badge.svg?branch=master)](https://coveralls.io/r/keystonejs/grappling-hook?branch=master)

>pre/post hooking enabler 

`grappling-hook` allows you to add pre/post hooks to objects and prototypes.
A number of modules already exist that allow you to do just the same, but the most popular one ([hooks](https://www.npmjs.com/package/hooks)) is no longer maintained.
Also, we wanted a more granular control of the hooking process and the way middleware is called.

**NEW:**
 
* since v2.4 you can [wrap sync methods](#adding-hooks-to-synchronized-methods) and [call sync hooks](#synchronized-hooks).
* since v2.3 you can [configure `grappling-hook` to use other method names](#other-qualifiers) than `pre` or `post`, e.g. `before` and `after`.

## Installation

```sh
$ npm install grappling-hook
```

## Usage


#### Creating a `grappling-hook` object

You can easily add methods to a new `grappling-hook` instance which are automatically ready for hooking up middleware:

```js
var grappling = require('grappling-hook');

var instance = grappling.create(); // create an instance

instance.addHooks({ // declare the hookable methods
	save: function(done) {
		console.log('save!');
		done();
	}
});

instance.pre('save', function() { //allow middleware to be registered for a hook
	console.log('saving!');
}).post('save', function() {
	console.log('saved!');
});

instance.save(function(err) {
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

#### Using an existing object

Or you can choose to enable hooking for an already existing object with methods:

```js
var grappling = require('grappling-hook');

var instance = {
	save: function(done) {
		console.log('save!');
		done();
	}
};

grappling.mixin(instance); // add grappling-hook functionality to an existing object

instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function() {
	console.log('saving!');
}).post('save', function() {
	console.log('saved!');
});

instance.save(function(err) {
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

#### Using a 'class'

Or you can patch a `prototype` with `grappling-hook` methods:

```js
var grappling = require('grappling-hook');

var Clazz = function() {
};
Clazz.prototype.save = function(done) {
	console.log('save!');
	done();
};

grappling.attach(Clazz); // attach grappling-hook functionality to a 'class'

var instance = new Clazz();
instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function() {
	console.log('saving!');
}).post('save', function() {
	console.log('saved!');
});

instance.save(function(err) {
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

All of this is pretty standard stuff, there's two things to note here though:

1. By default you _have_ to be explicit about which methods you want to make hookable. (There's a more _lenient_ mode as well though)
1. Middleware doesn't have to accept a `next` callback, i.e. you can use sync functions as middleware too, as in the examples above.

#### Adding hooks to synchronized methods

`addSyncHooks` allows you to register methods for enforced synchronized middleware execution (`addHooks` allows mixing of both and will _always_ finish async):

```js
var grappling = require('grappling-hook');

var instance = {
	saveSync: function(filename) {
		filename = Date.now() + '-' + filename;
		console.log('save', filename);
		return filename;
	}
};

grappling.mixin(instance); // add grappling-hook functionality to an existing object

instance.addSyncHooks('saveSync'); // setup hooking for an existing (sync) method

instance.pre('saveSync', function() {
	console.log('saving!');
}).post('saveSync', function() {
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

Middleware registered with synchronized hook will **NOT** receive `next` nor `done` callbacks, i.e. async serial or parallel middleware registration is not possible.

### Adding middleware

Middleware is added mainly with the `pre` and `post` methods. 

#### Middleware types

`grappling-hook` allows you to add both sync and async functions, run in series or parallel. 
The type of function is identified through the parameters it accepts:

- **Sync**: no callbacks are accepted.

	```js
	instance.pre('save', function(){
		// will run synchronously, the next middleware will be executed immediately once this has finished
	});
	```

- **Async serial**: a single callback is accepted

	```js
	instance.pre('save', function(next){
		//execution of following middleware is halted until `next` is called
		setTimeout(next, 1000);
	});
	```

- **Async/sync parallel**: two callbacks are accepted

	```js
	instance.pre('save', function(next, done){
		//execution of following middleware is halted until `next` is called
		setTimeout(next, 500);
		//the full middleware queue is considered finished once all parallel `done` callbacks have finished
		setTimeout(done, 1000);
	});
	```
	
You can **mix sync/async serial/parallel middleware** any way you choose:

```js
instance.pre('save', function(next) {
	//async serial
	console.log('A setup');
	setTimeout(function() {
		console.log('A done');
		next();
	}, 100);
}, function() {
	//sync
	console.log('B done');
}, function(next, done) {
	//async parallel
	console.log('C setup');
	setTimeout(function() {
		console.log('C done');
		done();
	}, 200);
	next();
}, function(next, done) {
	//async parallel
	console.log('D setup');
	setTimeout(function() {
		console.log('D done');
		done();
	}, 30);
	next();
});
```
```sh
# output
A setup
A done
B done
C setup
D setup
D done
C done
```

#### Qualified hooks

We've provided another (convenience) method to add middleware too: `hook`. It registers middleware to a qualified hook (e.g. `pre:save`).

```js
instance.hook('pre:save', function(){
	console.log('pre');
});
instance.save(function(){
	console.log('All done!!');
});
```
```sh
# output
pre
All done!!
```

#### Easy parameter passing

We like to cater to many coding styles: all of the middleware addition methods accept any number of middleware to be added, either as parameters or as an array (or as a mix);

```js
instance.pre('save', fn1, fn2, [fn3, fn4], fn5);
// equals:
instance.pre('save', [fn1, fn2, fn3, fn4, fn5]);
// equals:
instance.pre('save', fn1, fn2, fn3, fn4, fn5);
```

### Removing middleware

You can remove middleware with the `unhook` method.

```js
//removes `logSave` function for "pre:save"
instance.unhook("pre:save", logSave);

//remove all middleware for "pre:save"
instance.unhook("pre:save");

//remove all middleware for "save", i.e. both "pre" and "post"
instance.unhook("save");

//remove ALL middleware
instance.unhook();
```

### Manual calling of hooks

Sometimes its beneficial to be able to call a hook manually, i.e. without adding hooking to a specific method. This allows for more complex and branched flows.

```js
var instance = grappling.create(); // create an instance

instance.allowHooks('save'); // since we won't be wrapping a function with a hooking, we need to explicitly tell which hook will be available for middleware

instance.pre('save', function(){
	console.log('saving!');
});

instance.callHook('pre:save'); // <--- let's run our middleware
```
```sh
# output:
saving!
```

**N.B.**: Only qualified hooks (e.g. "pre:save", NOT "save") are callable, since it doesn't really make sense to call both pre/post hooks consecutively, w/o doing anything in between.

#### parameters

You can pass any number of parameters to your middleware:

```js
instance.pre('save', function(foo, bar){
	console.log('saving!', foo, bar);
});

instance.callHook('pre:save', 'foo', { bar: 'bar'});
```
```sh
# output:
saving! foo { bar: 'bar' }
```

Again, parameters are parsed forgivingly, e.g.:

```js
instance.callHook('pre:save', "foo", { bar: "bar"});
// equals:
instance.callHook('pre:save', ["foo", { bar: "bar"}]);
// equals:
instance.callHook('pre:save', ["foo"], { bar: "bar"});
```

There's one caveat: **if you wish to pass functions to your middleware, it's best to wrap them in an Array**, since otherwise the last one will be regarded as a _final_ callback, i.e. it won't be passed to the middleware, but will be executed once all middleware has finished.

```js
instance.callHook('pre:save', [fn1, fn2, fn3]);
```

#### context

By default all middleware is called with the hooking instance as an execution context, e.g.:

```js
instance.pre('save', function(){
	console.log(this);
});

instance.toString = function(){
	return "That's me!!";
};
instance.callHook('pre:save');
```
```sh
# output:
That's me!!
```

However, `callHook` accepts a `context` parameter to change the scope:

```js
instance.pre('save', function() {
	console.log(this);
});

instance.toString = function() {
	return "That's me!!";
};

var context = {
	toString: function() {
		return 'Different context!';
	}
};
instance.callHook(context, 'pre:save');
```
```sh
# output:
Different context!
All done!!
```

#### callback

And last, but definitely not least, if you want to be able to respond to all middleware (sync/async serial/parallel) having completed their execution, you can pass a function as the last parameter to `callHook`:

```js
instance.pre('save', function asyncMiddleware(next){
	setTimeout(function(){
		console.log('middleware');
		next();
	}, 100);
});

instance.callHook('pre:save', function(){
	console.log("We're finished!");
});
```
```sh
# output:
middleware
We're finished!
```

The full function signature of `callHook`:

```js
function callHook([context], qualifiedHook, [...params[]], [callback])
// e.g.
this.callHook(delegate, 'pre:save', "foo", "bar", {baz: qux}, this.save);
```

### Synchronized hooks

I you want to enforce a synchronized execution of hook middleware you can use `callSyncHook`.

```js
instance.pre('saveSync', function syncMiddleware(foo, bar){
	console.log('middleware', foo, bar);
});

console.log('before callSyncHook');
instance.callSyncHook('pre:saveSync', 'foo', 'bar');
console.log('after callSyncHook');
```
```
# output:
before callSyncHook
middleware foo bar
after callSyncHook
```

`callSyncHook` does **NOT** provide `next` nor `done` callbacks to the middleware, neither does it allow passing a "final" callback to the method itself.

### Middleware introspection

A number of methods are provided which allow you to introspect the added middleware and hooks.

```js
//returns all middleware functions registered for "pre:save"
instance.getMiddleware("pre:save");

//returns `true` if any middleware functions are registered for "pre:save"
instance.hasMiddleware("pre:save");

//return `true` if adding middleware to "pre:save" is allowed (with `allowHooks` or `addHooks`)
instance.hookable("pre:save");
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
		pre: "before",
		post: "after"
	}
});

//now use `before` and `after` instead of `pre` and `post`:

instance.addHooks("save");
instance.before("save", fn);
instance.after("save", fn);
instance.save();
```

There's one caveat: you _have_ to configure both or none.

### Error handling

- Errors thrown in sync middleware will bubble through 

	```js
	instance.pre('save', function(){
		throw new Error('Oh noes!');
	});
	instance.callHook('pre:save', function(err){
		if(err){
			console.log('An error occurred:', err); // <--- will not be called
		}
	});
	```
	```sh
	# output:
	Error: Oh noes!
	```
	
- async middleware can pass errors to their `next` (serial or parallel) or `done` (parallel only) callbacks:

	```js
	//async serial
	instance.pre('save', function(next){
		next(new Error("Oh noes!"));
	});
	```	
	```js
	//async parallel
	instance.pre('save', function(next, done){
		next();
		done(new Error("Oh noes!"));
	});
	```	
	```js
	instance.callHook('pre:save', function(err){
		if(err){
			console.log('An error occurred:', err);
		}
	});
	```
	```sh
	# output for both:
	An error occurred: Oh noes!
	```
