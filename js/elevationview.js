define(["jquery.ui"], function () {
	$.widget("cjb.ElevationView", {
		options: {},

		_create: function () {
			this.interior = $("<div>", { class: "interior" }).height(100);
			this.element.append(this.interior);

			this.rider = $("<img>", { class: "rider", src: "graphics/rider.png" });
			this.interior.append(this.rider);

			this.options.sampleRate = 55;   // meters per data point

			this.VERTICAL_BUFFER = 200;

			this.setupTerrainView();
		},

		setupTerrainView: function () {
			var win_width = this.interior.width();
			var win_height = this.interior.height();

			this.total_width = win_width * 5;
			this.total_height = win_height * 5;

			this.paper = new Raphael(this.interior[0], this.total_width, Math.floor(this.total_height + this.VERTICAL_BUFFER));

			$("svg").css( { position: "absolute", top: 0, left: 0 });

			// 52 x 43
			this.rider.css({ left: this.interior.width() * .5 - 26, top: this.interior.height() * .75 - 43 });
		},

		// THEORY: generate a terrain snapshot of, say, the next 5km and scroll through that

		refresh: function (distance, gradient, options) {
			switch (this.options.zoomLevel) {
				case "race":
					if (this.lastDistance == undefined) {
						this.generateSnapshot(distance);
					}

					var x = this.getXFromDistance(distance);
					var y = this.getYFromDistance(distance);

					this.rider.css({ left: x - 26, top: y - 21, "z-index": 1000 });

					break;

				case "rider":
					var HALF = (this.interior.width() * .5) / this.pixels_per_meter_y;

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

					this.rider.stop().animate({fakeProperty: degrees}, {
						step: function (now, fx) {
							$(this).css("transform", "rotate(" + now + "deg)");
						},
						duration: duration
					}, "linear");

					if (!newSnapshot) {
						this.element.find("svg").stop().animate({left: -x, top: -y}, duration, "linear");
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
					break;
			}

			this.lastDistance = distance;
		},

		getSamplesPerScreen: function () {
			return Math.ceil(this.zoomWidth / this.options.sampleRate);
		},

		// draw terrain from distance - 500 to distance + 4500
		generateSnapshot: function (distance) {
			if (this.elevationPath)
				this.elevationPath.remove();

			var start, end;
			var SAMPLES;
			var viewWidth, viewHeight;
			var bottomY;
			var marginTop = 0;

			switch (this.options.zoomLevel) {
				case "race":
					start = 1;
					end = this.options.raceManager.getStageDistance();
					this.zoomWidth = end - start;
					SAMPLES = this.interior.width();
					viewWidth = this.interior.width();
					viewHeight = this.interior.height() - 20;
					marginTop = 20;
					bottomY = viewHeight + marginTop;
					break;

				case "rider":
					start = distance - 500;
					end = distance + 500;
					this.zoomWidth = end - start;
					SAMPLES = this.zoomWidth / this.options.sampleRate;
					viewWidth = this.total_width;
					viewHeight = this.total_height;
					bottomY = Math.floor(viewHeight) + this.VERTICAL_BUFFER;
					break;
			}

			this.pixels_per_meter_x = viewWidth / this.zoomWidth;

			var elev0 = undefined;

			// first go through and find the range of values
			this.pts = [];

			var elev_min = undefined, elev_max = undefined;

			var meters_per_sample = this.zoomWidth / SAMPLES;

			for (var i = 0; i <= SAMPLES; i++) {
				var d = start + (i * meters_per_sample);
				var elev = this.options.raceManager.getElevationAtDistance(d);
				this.pts[i] = elev;
				if (elev < elev_min || elev_min == undefined) elev_min = elev;
				else if (elev > elev_max || elev_max == undefined) elev_max = elev;
			}

			this.rider_pt = Math.floor(500 / meters_per_sample);
			var elev_current = undefined;
			while (!elev_current && this.rider_pt < this.pts.length) {
				elev_current = this.pts[++this.rider_pt];
			}

			this.elev_min = elev_min;

			switch (this.options.zoomLevel) {
				case "race":
					this.pixels_per_meter_y = viewHeight / (elev_max - elev_min);
					break;

				case "rider":
					this.pixels_per_meter_y = 4;
					break;
			}

			var lastX, lastY;

			var p = "M0," + bottomY;

			for (var i = 0; i <= SAMPLES; i++) {
				var elev = this.pts[i];

				if (!elev) {
					elev = this.getFirstElevationPoint();
				}

				if (elev) {
					var x = Math.floor((i / SAMPLES) * viewWidth);
					var y = Math.floor((marginTop + viewHeight) - (((elev - elev_min) * this.pixels_per_meter_y)));

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

			var x1 = Math.floor(viewWidth);
			p += "L" + x1 + "," + bottomY + "Z";

			this.elevationPath = this.paper.path(p).attr( { stroke: "#0ADA0A", fill:  "#00a000" });

			this.snapshot_start = start;
			this.snapshot_end = end;
		},

		getFirstElevationPoint: function () {
			var SAMPLES = this.getSamplesPerScreen();

			for (var i = 0; i <= SAMPLES; i++) {
				if (this.pts[i]) return this.pts[i];
			}

			return undefined;
		},

		getXFromDistance: function (distance) {
			var d = (distance - this.snapshot_start) / this.zoomWidth;
			return d * this.interior.width();
		},

		getYFromDistance: function (distance) {
			var marginTop = 20;
			var viewHeight = this.interior.height() - 20;

			var elev = this.options.raceManager.getElevationAtDistance(distance);

			var y = Math.floor((marginTop + viewHeight) - (((elev - this.elev_min) * this.pixels_per_meter_y)));

			return y;
		},

		getSnapshotXFromDistance: function (distance) {
			var SAMPLES = this.getSamplesPerScreen();
			var d = distance - this.snapshot_start;
			var x = d / this.options.sampleRate;
			x = (x / SAMPLES) * this.total_width;
			x -= this.interior.width() * .5;
			return x;
		},

		getSnapshotYFromElevation: function (elev) {
			var y = this.total_height - ((elev - this.elev_min) * this.pixels_per_meter_y);
			y -= this.interior.height() * .75;
			return y;
		}
	});
});