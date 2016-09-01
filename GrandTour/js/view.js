define(function () {
		function View (ui) {
			this.ui = ui;

			this.ui.empty();

			return (this);
		}

		View.prototype = {
			getName: function () {
				return "Generic View";
			},

			initialize: function (rm) {

			},

			step: function (rm) {
				console.log("tick");
			}
		};

		// Return the base Model constructor.
		return (View);
	}
);