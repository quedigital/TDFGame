// Define the Friend model class. This extends the core Model.
define(["./view"], function (View) {
		// I return an initialized object.
		function TopView (ui) {
			// Call the super constructor.
			View.call(this, ui);

			// Store the name.
			this._name = name;

			// Return this object reference.
			return (this);
		}

		// The Friend class extends the base Model class.
		TopView.prototype = Object.create(View.prototype);

		TopView.prototype = {
			getName: function () {
				return "Top View";
			},

			initialize: function (rm) {
				var riders = rm.getRiders();

				var me = this;

				_.each(riders, function (rider, index) {
					var nick = rider.rider.options.name.substr(0, 1).toUpperCase();

					var r = $("<span>", { text: nick, class: "rider" }).attr("data-index", index);
					me.ui.append(r);
				});
			},

			step: function (rm) {
				var riders = rm.getRiders();

				var me = this;

				var WIDTH = 800;
				var TOTAL_DISTANCE = 15;

				_.each(riders, function (rider, index) {
					var r_ui = me.ui.find(".rider[data-index=" + index + "]");
					var x = rider.rider.getDistance() / TOTAL_DISTANCE * WIDTH;

					r_ui.css("left", x);
				});
			}
		};

		// Return the base Friend constructor.
		return (TopView);
	}
);