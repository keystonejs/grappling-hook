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
instance.pre('save', function (done) {
    console.log('saving!');
    setTimeout(done, 1000);
}).post('save', function () {
    console.log('saved!');
});
 
instance.save(function (err) {
   console.log('All done!!');
});
