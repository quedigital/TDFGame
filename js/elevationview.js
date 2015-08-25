define(["jquery.ui"], function () {
	$.widget("cjb.ElevationView", {
		options: {},

		_create: function () {
			this.interior = $("<div>", { class: "interior" }).height(100);
			this.element.append(this.interior);

			this.rider = $("<img>", { class: "rider", src: "graphics/rider.png" });
			this.interior.append(this.rider);

			this.options.min = 1000;
			this.options.max = 2000;
			this.options.map_length = 113000;

			this.BUFFER = 200;

			this.setupTerrainView();
		},

		setupTerrainView: function () {
			var win_width = this.interior.width();
			var win_height = this.interior.height();

			this.total_width = win_width * 5;
			this.total_height = win_height * 5;

			// THEORY: map viewport always shows 1000 meters
			// TODO: determine max height needed; ie, steepest section

			this.paper = new Raphael(this.interior[0], this.total_width, Math.floor(this.total_height + this.BUFFER));

			$("svg").css( { position: "absolute", top: 0, left: 0 });

			// 52 x 43
			this.rider.css({ left: this.interior.width() * .5 - 26, top: this.interior.height() * .5 - 43 });
		},

		// THEORY: generate a terrain snapshot of, say, the next 5km and scroll through that

		refresh: function (distance, gradient, options) {
			var HALF = (this.interior.width() * .5) * this.meters_per_pixel_x;

			var newSnapshot = false;

			if (distance - HALF <= this.snapshot_start || distance + HALF >= this.snapshot_end || this.snapshot_end == undefined || this.snapshot_start == undefined) {
				this.generateSnapshot(distance);
				newSnapshot = true;
			}

			// move the snapshot so it's centered on the rider
			var x = this.getSnapshotXFromDistance(distance);

			var elev = this.options.raceManager.getElevationAtDistance(distance);
			var y = this.getSnapshotYFromElevation(elev);

			var duration = undefined;
			if (options) {
				duration = 1000 / options.updatesPerSecond;
			}

			var degrees = -Math.floor(gradient * 450) * .1;

			this.rider.stop().animate({ fakeProperty: degrees }, {
				step: function (now, fx) {
					$(this).css("transform", "rotate(" + now + "deg)");
				},
				duration: duration
			}, "linear");

			if (!newSnapshot) {
				this.element.find("svg").stop().animate( { left: -x, top: -y }, duration, "linear" );
			} else {
				if (this.lastDistance != undefined) {
					// new snapshot, draw us at our last position
					var x0 = this.getSnapshotXFromDistance(this.lastDistance);

					var elev0 = this.options.raceManager.getElevationAtDistance(this.lastDistance);
					var y0 = this.getSnapshotYFromElevation(elev0);

					this.element.find("svg").stop().css({left: -x0, top: -y0});
					this.element.find("svg").animate({left: -x, top: -y}, duration, "linear");
				} else {
					this.element.find("svg").stop().css({left: -x, top: -y});
				}
			}

			this.lastDistance = distance;
		},

		// draw terrain from distance - 500 to distance + 4500
		generateSnapshot: function (distance) {
			if (this.elevationPath)
				this.elevationPath.remove();

			var RANGE = 5000, SAMPLES = 100;    // sample every 50 meters
			var LEFT = 2500, RIGHT = 2500;

			var start = distance - LEFT;
			var end = distance + RIGHT;

			this.meters_per_pixel_y = 2;
			this.meters_per_pixel_x = RANGE / this.total_width;

			var w = this.interior.width();
			var h = this.interior.height();
			var half = this.total_height * .5;

			var elev0 = undefined;

			// first go through and find the range of values
			this.pts = [];

			var elev_min = undefined, elev_max = undefined;

			var step_size = RANGE / SAMPLES;

			for (var i = 0; i <= SAMPLES; i++) {
				var d = start + (i * step_size);
				var elev = this.options.raceManager.getElevationAtDistance(d);
				this.pts[i] = elev;
				if (elev < elev_min || elev_min == undefined) elev_min = elev;
				else if (elev > elev_max || elev_max == undefined) elev_max = elev;
			}

			this.rider_pt = Math.floor(LEFT / step_size);
			var elev_current = undefined;
			while (!elev_current && this.rider_pt < this.pts.length) {
				elev_current = this.pts[++this.rider_pt];
			}

			this.elev_min = elev_min;

			var lastX, lastY;
			var bottomY = Math.floor(this.total_height) + this.BUFFER;

			var p = "M0," + bottomY;

			for (var i = 0; i <= SAMPLES; i++) {
				var elev = this.pts[i];

				if (!elev) {
					elev = this.getFirstElevationPoint();
				}

				if (elev) {
					var x = Math.floor((i / SAMPLES) * this.total_width);
					var y = Math.floor(this.total_height - ((elev - elev_min) / this.meters_per_pixel_y));

					if (i == 0) {
						p += "L" + x + "," + y;
					} else {
						var x1 = Math.floor((lastX + x) * .5);
						var y1 = Math.floor((lastY + y) * .5);
						p += "S" + x1 + "," + y1 + "," + x + "," + y;
					}

					lastX = x, lastY = y;
				}
			}

			var x1 = Math.floor(this.total_width);
			p += "L" + x1 + "," + bottomY + "Z";

			this.elevationPath = this.paper.path(p).attr( { stroke: "#0000d0", fill:  "#00a000" });

			this.snapshot_start = start;
			this.snapshot_end = end;
		},

		getFirstElevationPoint: function () {
			var SAMPLES = 100;

			for (var i = 0; i <= SAMPLES; i++) {
				if (this.pts[i]) return this.pts[i];
			}

			return undefined;
		},

		getSnapshotXFromDistance: function (distance) {
			var RANGE = 5000, SAMPLES = 100;    // sample every 50 meters
			var step_size = RANGE / SAMPLES;
			var LEFT = 500;
			var d = distance - this.snapshot_start;
			var x = d / step_size;
			x = (x / SAMPLES) * this.total_width;
			x -= this.interior.width() * .5;
			return x;
		},

		getSnapshotYFromElevation: function (elev) {
			var y = this.total_height - ((elev - this.elev_min) / this.meters_per_pixel_y);
			y -= this.interior.height() * .5;
			return y;
		}
	});
});