define(["jquery.ui", "elevationview"], function () {
	String.prototype.toHHMMSS = function () {
		var sec_num = parseInt(this, 10); // don't forget the second param
		var hours   = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);

		if (hours   < 10) {hours   = "0"+hours;}
		if (minutes < 10) {minutes = "0"+minutes;}
		if (seconds < 10) {seconds = "0"+seconds;}
		var time    = hours+':'+minutes+':'+seconds;
		return time;
	};

	$.widget("cjb.RiderControl", {
		options: {},

		_create: function () {
			for (var i = 0; i < this.options.riders.length; i++) {
				var r = this.options.riders[i];

				var a = $("<a>", { text: r.name }).data("number", r.number).click($.proxy(this.onChangeRider, this));
				var el = $("<li>").append(a);
				this.element.find("ul").append(el);
			}

			this.elevation = this.element.find(".elevation-view").ElevationView( { raceManager: this.options.mgr, zoomLevel: "race" } );

			$(".game-container").on("rider-update", $.proxy(this.onRiderUpdate, this));
			$("#distance-setter").change($.proxy(this.onSetDistance, this));
		},

		getRider: function (number) {
			for (var i = 0; i < this.options.riders.length; i++) {
				var r = this.options.riders[i];
				if (r.number == number) return r;
			}
			return null;
		},

		onChangeRider: function (event) {
			var number = $(event.target).data("number");
			this.selectRider(number);
		},

		selectFirstRider: function (options) {
			var number = this.options.riders[0].number;
			this.selectRider(number);
		},

		selectRider: function (number) {
			this.selectedRiderNumber = number;

			this.refreshUI();
		},

		refreshUI: function (options) {
			var r = this.getRider(this.selectedRiderNumber);

			this.element.find("#dropdown-title").text(r.name);

			var exertion = Math.round(r.exertion * 100);
			this.element.find("#lblExertion").text(exertion + "%");

			var power = Math.round(r.currentPower);
			this.element.find("#lblPower").text(power + " watts");

			var speed = Math.round((r.currentSpeed * 60 * 60) / 1000);
			this.element.find("#lblSpeed").text(speed + " km/h");

			var distance = Math.round(r.currentDistance / 100) / 10;
			this.element.find("#lblDistance").text(distance + " km");

			var gradient = Math.round(r.currentGradient * 1000) / 10;
			this.element.find("#lblGradient").text(gradient + "%");

			var time = this.options.mgr.elapsedTime;
			this.element.find("#lblTime").text(("" + time).toHHMMSS());

			//options = $.extend(options);

			this.elevation.ElevationView("refresh", r.currentDistance, r.currentGradient, options);
		},

		onRiderUpdate: function (event, options) {
			this.refreshUI(options);
		},

		onSetDistance: function (event) {
			var val = $(event.currentTarget).val();

			var r = this.getRider(this.selectedRiderNumber);
			if (r) {
				var dist = parseFloat(val);
				r.setDistance(dist);

				this.refreshUI();
			}
		}
	});
});