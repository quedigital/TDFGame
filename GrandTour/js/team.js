define([], function () {
	function Team (options) {
		this.options = options;

		this.reset();
	}

	Team.prototype = {
		reset: function () {
		},

		getRiders: function () {
			return this.options.riders;
		},

		getRider: function (index) {
			return this.options.riders[index];
		},

		getNumRiders: function () {
			return this.options.riders.length;
		}
	};

	return Team;
});
