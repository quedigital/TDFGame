define([], function () {
	function Map (options) {
		this.options = options;
	}

	Map.prototype = {
		getTotalDistance: function () {
			var total = 0;
			for (var i = 0; i < this.options.gradients.length; i++) {
				total += this.options.gradients[i][0];
			}

			return total;
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
