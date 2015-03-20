>pre/post hooking enabler 

`grappling-hook` allows you to add pre/post hooks to objects and prototypes.
A number of modules already exist that allow you to do just the same, but the most popular one ([hooks](https://www.npmjs.com/package/hooks)) is no longer maintained.
Also, we wanted a more granular control of the hooking process and the way middleware is called.

## Installation

```sh
$ npm install grappling-hook
```

## Usage


### Creating a `grappling-hook` object

You can easily add methods to a new `grappling-hook` instance which are automatically ready for hooking up middleware:

```js
var grappling = require('grappling-hook');

var instance = grappling.create(); // create an instance

instance.addHooks({ // declare the hookable methods
	save: function(){
		console.log('save!');
	}
});

instance.pre('save', function(){ //allow middleware to be registered for a hook
	console.log('saving!');
}).post('save', function(){
	console.log('saved!');
});

instance.save();
```
```sh
# output:
saving!
save!
saved!
```

### Using an existing object

Or you can choose to enable hooking for an already existing object with methods:

```js
var grappling = require('grappling-hook');

var instance = {
	save : function(){
		console.log('save!');
	}
};

grappling.mixin(instance); // add grappling-hook functionality to an existing object

instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function(){
	console.log('saving!');
}).post('save', function(){
	console.log('saved!');
});

instance.save();
```
```sh
# output:
saving!
save!
saved!
```

### Using a 'class'

Or you can patch a `prototype` with `grappling-hook` methods:

```js
var grappling = require('grappling-hook');

var Clazz = function(){};
Clazz.prototype.save = function(){
	console.log('save!');
}

grappling.attach(Clazz); // attach grappling-hook functionality to a 'class'

var instance = new Clazz();
instance.addHooks('save'); // setup hooking for an existing method

instance.pre('save', function(){
	console.log('saving!');
}).post('save', function(){
	console.log('saved!');
});

instance.save();
```
```sh
# output:
saving!
save!
saved!
```

All of this is pretty standard stuff, there's two things to note here though:

1. By default you _have_ to be explicit about which methods you want to make hookable. (There's a more _lenient_ mode as well though)
1. Middleware doesn't have to accept a `next` callback, i.e. you can use sync functions as middleware too, as in the examples above.

## Sync and async middleware

`grappling-hook` allows you to register both sync and async middleware to a hook. An async middleware function simply declares a `next` parameter last.

**N.B.**: This parameter _has_ to be called `next` or `callback`, otherwise it won't be recognized as being an async function.

```js
instance.pre('save', function(next){
	setTimeout(function(){
		console.log('async');
		next();
	}, 1000);
}, function(){
	console.log('sync');
});
```
```sh
# output
async
sync
```

All middleware is called serially, i.e. execution of the next middleware function will happen _after_ the first middleware has completed its asynchronous operation.
Parallel and mixed (parallel and serial) execution is on the roadmap and will be added soon!

## Manual calling of hooks

Sometimes its beneficial to be able to call a hook manually, i.e. without adding hooking to a specific method. This allows for more complex and branched flows.

```js
var instance = grappling.create(); // create an instance

instance.allowHooks('save'); // since we won't be wrapping a function with a hooking, we need to explicitly tell which hook will be available for middleware

instance.pre('save', function(){
	console.log('saving!');
});

instance.callHook('pre:save');
```
```sh
# output:
saving!
```

This also allows us to pass specific arguments to our middleware:

```js
instance.pre('save', function(foo, bar){
	console.log('saving!', foo, bar);
});

instance.callHook('pre:save', "foo", { bar: "bar"});
```
```sh
# output:
saving!
```

**N.B.**: Only qualified hooks (e.g. "pre:save", NOT "save") are callable, since it doesn't really make sense to call both pre/post hooks consecutively, w/o doing anything in between.

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
instance.pre('save', function(){
	console.log(this);
});

instance.toString = function(){
	return "That's me!!";
};

var context = {
	toString : function(){
		return "Different context!"
	}
}
instance.callHook(context, 'pre:save');
```
```sh
# output:
Different context!
```

And last, but definitely not least, if you want to be able to respond to all middleware having completed their execution, you can pass a function as the last parameter to `callHook`:

```js
instance.pre('save', function asyncMiddleware(next){
	setTimeout(function(){
		console.log("middleware")
	}, 1000);
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

