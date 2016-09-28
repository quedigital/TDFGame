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
				var tr = $("<tr>", { id: "rider-" + i });
				var f1 = $("<td>", { text: rider.options.name });
				var f2 = $("<td>", { text: shortDistance(rider.getDistance()) });
				var f3 = $("<td>", { text: rider.getTimeAsString() });
				tr.append(f1);
				tr.append(f2);
				tr.append(f3);

				tb.append(tr);
			}

			this.container.append(t);
		},

		step: function (rm) {
			this.updateStandings();
		},

		updateStandings: function () {
			var riders = this.rm.getRiders();

			var data = [];

			for (var i = 0; i < riders.length; i++) {
				var rider = riders[i];
				data[i] = [rider.options.name, rider.getDistance(), rider.getTime(), shortDistance(rider.getDistance()), rider.getTimeAsString()];
			}

			data = data.sort(sortByDistanceThenTime);

			for (var i = 0; i < data.length; i++) {
				var tr = this.container.find("tr").eq(i);
				tr.find("td:nth-child(1)").text(data[i][0]);
				tr.find("td:nth-child(2)").text(data[i][3]);
				tr.find("td:nth-child(3)").text(data[i][4]);
			}

			// sort by distance, then time
		}
	});

	function sortByDistanceThenTime (a, b) {
		if (a[1] != b[1]) {
			return b[1] - a[1];
		} else {
			return a[2] - b[2];
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

	return (StandingsView);
});