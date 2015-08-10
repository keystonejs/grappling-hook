'use strict';

module.exports = function(value) {
	return {
		now: function() {
			return value;
		}
	};
};

