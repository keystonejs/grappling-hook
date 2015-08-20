module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
	  'gh-pages': {
	    options: {
	      base: 'docs'
	    },
	    src: ['**']
	  }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-gh-pages');

};
