'use strict';
/* eslint-env node, mocha */

var expect = require('must');
var P = require('bluebird');

var subject = require('../index');
var $ = require('./fixtures');
var console;
var Date; //eslint-disable-line no-native-reassign
describe('examples', function() {
	describe('spec file', function() {
		it('should be found', function() {
			expect(true).to.be.true();
		});
	});
	beforeEach(function() {
		console = $.console();
		Date = $.date(0); //eslint-disable-line no-native-reassign
	});
	
	describe('https://github.com/keystonejs/grappling-hook#mix-middleware-types', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.mixin({
				save: function save(callback) {
					callback();
				}
			});
			instance.addHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql([
					'async serial: setup', 
					'async serial: done', 
					'sync: done', 
					'async parallel: setup', 
					'thenable: setup', 
					'thenable: done', 
					'async parallel: done'
				]);
				done();
			};
			(function() {
				instance.pre('save', function(next) {
					//async serial
					console.log('async serial: setup');
					setTimeout(function() {
						console.log('async serial: done');
						next();
					}, 100);
				}, function() {
					//sync
					console.log('sync: done');
				}, function(next, done) {
					//async parallel
					console.log('async parallel: setup');
					setTimeout(function() {
						console.log('async parallel: done');
						done();
					}, 200);
					next();
				}, function() {
					//thenable
					console.log('thenable: setup');
					var done;
					var promise = new P(function(resolve){
						done = resolve;
					});
					setTimeout(function() {
						console.log('thenable: done');
						done();
					}, 30);
					return promise;
				});
			})();

			instance.save(expectations);
		});
	});	
	
	describe('https://github.com/keystonejs/grappling-hook#creating-a-grappling-hook-object', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var expectations = function() {
				expect(console.logs).to.eql(['saving!', 'save!', 'saved!', 'All done!!']);
				done();
			};
			(function() {
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

				instance.save(function() {
					console.log('All done!!');
					expectations();
				});
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#using-an-existing-object', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var expectations = function() {
				expect(console.logs).to.eql(['saving!', 'save!', 'saved!', 'All done!!']);
				done();
			};
			(function() {
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

				instance.save(function() {
					console.log('All done!!');
					expectations();
				});
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#using-a-class', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var expectations = function() {
				expect(console.logs).to.eql(['saving!', 'save!', 'saved!', 'All done!!']);
				done();
			};
			(function() {
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

				instance.save(function() {
					console.log('All done!!');
					expectations();
				});
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#adding-hooks-to-synchronized-methods', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var expectations = function() {
				expect(console.logs).to.eql(['saving!', 'save 0-example.txt', 'saved!', 'new name: 0-example.txt']);
				done();
			};
			(function() {
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
				expectations();
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#parameters', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.mixin({
				save: function save(callback) {
					callback();
				}
			});
			instance.addHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(['saving! foo [object Object]']);
				done();
			};
			(function() {
				instance.pre('save', function(foo, bar) {
					console.log('saving!', foo, bar);
				});

				instance.callHook('pre:save', 'foo', {bar: 'bar'}, function() {
					expectations();
				});
			})();
		});
	});

	describe('https://github.com/keystonejs/grappling-hook#contexts', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.create();
			instance.allowHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(["That's me!!"]);
				done();
			};
			(function() {
				instance.pre('save', function() {
					console.log(this);
				});

				instance.toString = function() {
					return "That's me!!";
				};
				instance.callHook('pre:save', function() {
					expectations();
				});
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#contexts 2', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.create();
			instance.allowHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(['Different context!']);
				done();
			};
			(function() {
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
				instance.callHook(context, 'pre:save', function() {
					expectations();
				});
			})();
		});
	});
	
	describe('https://github.com/keystonejs/grappling-hook#qualified-hooks', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.mixin({
				save: function save(callback) {
					callback();
				}
			});
			instance.addHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(['pre', 'All done!!']);
				done();
			};
			(function() {
				instance.hook('pre:save', function() {
					console.log('pre');
				});
				instance.save(function() {
					console.log('All done!!');
					expectations();
				});
			})();
		});
	});

	describe('https://github.com/keystonejs/grappling-hook#error-handling', function() {
		var grappling = subject;
		it('should function correctly', function() {
			var instance = grappling.create();
			instance.allowHooks('pre:save');
			expect(function() {
				instance.pre('save', function() {
					throw new Error('Oh noes!');
				});
				instance.callSyncHook('pre:save');
			}).to.throw(/Oh noes!/);
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#error-handling 2', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.create();
			instance.allowHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(['An error occurred: Error: Oh noes!']);
				done();
			};
			(function() {
				//async serial
				instance.pre('save', function(next) {
					next(new Error('Oh noes!'));
				});
				instance.callHook('pre:save', function(err) {
					if (err) {
						console.log('An error occurred:', err);
					}
					expectations();
				});
			})();
		});
	});
	describe('https://github.com/keystonejs/grappling-hook#error-handling 3', function() {
		var grappling = subject;
		it('should function correctly', function(done) {
			var instance = grappling.create();
			instance.allowHooks('pre:save');
			var expectations = function expectations() {
				expect(console.logs).to.eql(['An error occurred: Error: Oh noes!']);
				done();
			};
			(function() {
				//async parallel
				instance.pre('save', function(next, done) {
					next();
					done(new Error('Oh noes!'));
				});
				instance.callHook('pre:save', function(err) {
					if (err) {
						console.log('An error occurred:', err);
					}
					expectations();
				});
			})();
		});
	});
});
