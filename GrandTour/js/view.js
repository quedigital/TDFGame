define(function () {
		function View (options) {
			this.container = options.container;
			this.disabled = options.disabled;

			if (this.container)
				this.container.empty();
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
			},

			setDisabled: function (disabled) {
				this.disabled = disabled;
			}
		};

		return (View);
	}
);