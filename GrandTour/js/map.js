define([], function () {
	function Map (options) {
		this.options = options;
	}

	Map.prototype = {
		getTotalDistance: function () {
			var n = this.options.gradients.length;

			return this.options.gradients[n - 1][0];
		},

		getGradientAtDistance: function (distance) {
			var total = 0;

			for (var i = 0; i < this.options.gradients.length; i++) {
				var grad = this.options.gradients[i];
				total += grad[0];
				if (total >= distance)
					return grad[1];
			}
			return 0;
		}
	};

	return Map;
});
