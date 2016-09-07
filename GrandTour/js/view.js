define(function () {
		function View (options) {
			this.container = options.container;
			this.disabled = options.disabled;

			this.container.empty();

			return (this);
		}

		View.prototype = {
			getName: function () {
				return "Generic View";
			},

			initialize: function (rm) {
				this.rm = rm;
			},

			step: function (rm) {
				console.log("tick");
			},

			onClickView: function (event) {
				this.rm.togglePause();
			}
		};

		return (View);
	}
);