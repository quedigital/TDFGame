define(["./view", "jquery"], function (View) {
	function StandingsView (options) {
		View.call(this, options);
	}

	StandingsView.prototype = Object.create(View.prototype);

	$.extend(StandingsView.prototype, {
		getName: function () {
			return "Standings View";
		},

		initialize: function (rm) {
			View.prototype.initialize.call(this, rm);

			this.container.addClass("standings");

			var riders = rm.getRiders();

			var t = $("<table>");
			var tb = $("<tbody>");
			t.append(tb);

			for (var i = 0; i < riders.length; i++) {
				var rider = riders[i];
				var tr = $("<tr>");
				var f1 = $("<td>", { text: "Name" });
				var f2 = $("<td>", { text: "Distance" });
				var f3 = $("<td>", { text: "Speed" });
				var f4 = $("<td>", { text: "Gap" });
				tr.append(f1);
				tr.append(f2);
				tr.append(f3);
				tr.append(f4);

				tb.append(tr);
			}

			this.container.append(t);

			this.initializedCallback();
		},

		step: function (rm) {
			this.updateStandings();
		},

		updateStandings: function () {
			var riders = this.rm.getRiders();

			var data = [];

			var firstRider;

			for (var i = 0; i < riders.length; i++) {
				var rider = riders[i];
				data[i] = {
					rider: rider,
					name: rider.options.name,
					distance: rider.getDistance(),
					time: rider.getTime(),
					speed: (rider.isFinished() ? rider.getAverageSpeed().toFixed(1) : rider.getCurrentSpeedInKMH().toFixed(1)) + " km/h",
					distanceReadable: shortDistance(rider.getDistance()),
					timeReadable: rider.getTimeAsString()
				};
			}

			data = data.sort(sortByDistanceThenTime);
			var lastGap;

			for (var i = 0; i < data.length; i++) {
				var tr = this.container.find("tr").eq(i);
				var gap = this.rm.getTimeGapBetween(data[0].rider, data[i].rider);
				if (gap == 0 || gap == lastGap) {
					gapReadable = "";
				} else {
					gapReadable = "+" + toMinutesAndSeconds(gap);
				}
				lastGap = gap;
				tr.find("td:nth-child(1)").text(data[i].name);
				tr.find("td:nth-child(2)").text(data[i].distanceReadable);
				tr.find("td:nth-child(3)").text(data[i].speed);
				tr.find("td:nth-child(4)").text(i == 0 ? data[i].timeReadable : gapReadable);
			}
		}
	});

	function sortByDistanceThenTime (a, b) {
		if (a.distance != b.distance) {
			return b.distance - a.distance;
		} else {
			return a.time - b.time;
		}
	}

	function shortDistance (d) {
		var s = d.toString();
		var p = s.indexOf(".");
		if (p == -1) {
			s += ".0";
		} else {
			s = s.substr(0, p + 2);
		}

		return s + " km";
	}

	function toMinutesAndSeconds (t) {
		var s = "";

		var mins = Math.floor(t / 60);
		var secs = t - mins * 60;
		if (mins > 0) {
			s = mins.toFixed(2) + "'";
		}
		if (secs > 0) {
			if (mins > 0) {
				s += " ";
			}
			if (secs != Math.floor(secs)) {
				s += secs.toFixed(2) + "\"";
			} else {
				s += secs + "\"";
			}
		}

		return s;
	}

	return (StandingsView);
});