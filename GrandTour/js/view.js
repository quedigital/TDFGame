define(function () {
		function View (options) {
			this.container = options.container;
			this.disabled = options.disabled;
			this.initialized = false;

			this.options = $.extend({}, options);

			if (this.container)
				this.container.empty();

			this.reset();
		}

		View.prototype = {
			getName: function () {
				return "Generic View";
			},

			initialize: function (rm) {
				this.rm = rm;
			},

			initializedCallback: function () {
				this.rm.initializedCallback(this);
			},

			step: function (rm) {
				console.log("tick");
			},

			reset: function () {
				this.initialized = false;
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