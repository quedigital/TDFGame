define(["underscore"], function (_) {
	function RaceManager (options) {
		this.options = options != undefined ? options : {};

		this.running = false;

		this.riders = [];
		this.time = 0;
	}

	RaceManager.prototype = {
		addRider: function (rider, gui) {
			this.riders.push({ rider: rider, gui: gui });

			if (gui) {
				$(gui).find(".slower").click($.proxy(this.onClickSlower, this, rider));
				$(gui).find(".faster").click($.proxy(this.onClickFaster, this, rider));

				this.updateUI();
			}
		},

		removeRider: function (rider) {
			for (var i = 0; i < this.riders; i++) {
				if (this.riders[i].rider == rider) {
					this.riders.splice(i, 1);
					break;
				}
			}
		},

		setMap: function (map) {
			this.map = map;
		},

		go: function (callback) {
			if (!this.running) {
				this.options.stepCallback = callback;

				this.running = true;

				this.doStep( { automatic: true } );
			}
		},

		stop: function () {
			this.running = false;
		},

		reset: function () {
			this.time = 0;
			this.running = false;

			_.each(this.riders, function (riderObj, index) {
				riderObj.rider.reset();
			});

			this.updateUI();
		},

		doStep: function (options) {
			var me = this;

			var thisMapDistance = this.getStageDistance();

			var allFinished = true;

			// 1. process solo and group leaders first
			_.each(this.riders, function (riderObj, index) {
				var rider = riderObj.rider;
				var d = rider.getDistance();
				var distanceToFinish = thisMapDistance - d;
				var map = me.map;
				var gradient = map.getGradientAtDistance(d);

				if (!rider.isFinished() && !rider.isInGroup()) {
					rider.step(gradient, distanceToFinish);

					if (rider.getDistance() >= thisMapDistance) {
						rider.setFinished(true);
					} else {
						allFinished = false;
					}
				}

				if (!options.nogui)
					me.updateGUI(rider, riderObj.gui);
			});

			// 2. process group followers second
			_.each(this.riders, function (riderObj, index) {
				var rider = riderObj.rider;
				var d = rider.getDistance();
				var map = me.map;
				var gradient = map.getGradientAtDistance(d);

				if (!rider.isFinished() && rider.isInGroup()) {
					rider.stepWithLeader(gradient);

					if (rider.getDistance() >= thisMapDistance) {
						rider.setFinished(true);
					} else {
						allFinished = false;
					}
				}

				if (!options.nogui)
					me.updateGUI(rider, riderObj.gui);
			});

			if (allFinished) {
				me.stop();
			}

			this.time++;

			if (this.running) {
				if (this.options.stepCallback) {
					this.options.stepCallback();
				}

				if (options.automatic)
					setTimeout($.proxy(this.doStep, this), 100, options);
			}

			return allFinished;
		},

		getStageDistance: function () {
			if (this.map) return this.map.getTotalDistance();
			else return undefined;
		},

		getLeadingRider: function () {
			var max, max_rider;

			for (var i = 0; i < this.riders.length; i++) {
				var rider = this.riders[i].rider;
				if (rider.getDistance() > max || max == undefined) {
					max = rider.getDistance();
					max_rider = rider;
				}
			}

			return max_rider;
		},

		getTimeElapsed: function () {
			return this.time;
		},

		updateUI: function () {
			var me = this;
			_.each(this.riders, function (riderObj, index) {
				var rider = riderObj.rider;
				me.updateGUI(rider, riderObj.gui);
			});
		},

		updateGUI: function (rider, gui) {
			$(gui).find("h4").text(rider.options.name);

			var stats = $(gui).find(".stats");
			if (stats) {
				var p = $("<p>", { text: "maxPower: " + rider.getMaxPower() });
				p.append($("<p>", { text: "accel: " + rider.getAcceleration() }));
				p.append($("<p>", { text: "recovery: " + rider.getRecovery() }));

				stats.html(p.html());
			}

			this.setBarGraph($(gui).find(".effort"), rider.getEffort(), 1.0, { round: true });
			this.setBarGraph($(gui).find(".power"), rider.getPower(), 1000);
			this.setBarGraph($(gui).find(".fuel"), rider.getFuelPercent(), 1.0, { percent: true });
			if (this.map) {
				this.setBarGraph($(gui).find(".distance"), rider.getDistance(), this.map.getTotalDistance());
			}
		},

		setBarGraph: function (el, val, max, opts) {
			var pct = (val / max) * 100;
			el.width(pct + "%");

			var s;

			if (opts == undefined) opts = {};

			if (opts.round)
				s = Math.floor(val * 100) / 100;
			else if (opts.percent)
				s = Math.floor(val * 100);
			else
				s = Math.floor(val);

			el.find(".label").text(s);
		},

		onClickSlower: function (rider, event) {
			rider.deltaEffort(-.1);
			this.updateUI();
		},

		onClickFaster: function (rider, event) {
			rider.deltaEffort(.1);
			this.updateUI();
		},

		runToFinish: function () {
			do {
				var finished = this.doStep({nogui: true});
			} while (!finished);
		},

		runTo: function (opts) {
			var target;

			if (opts.meters) {
				var dist = opts.meters;
				if (dist < 0)
					target = this.getStageDistance() + (dist / 1000);
				else
					target = dist / 1000;
			} else if (opts.percent) {
				target = this.getStageDistance() * (opts.percent / 100);
			}

			do {
				this.doStep({nogui: true});

				var leader = this.getLeadingRider();
				if (leader) lead = leader.getDistance();
			} while (leader != undefined && lead < target)
		},

		makeGroup: function (riderArray) {
			for (var i = 0; i < riderArray.length; i++) {
				var rider = riderArray[i];
				rider.setGroupLeader(riderArray[0]);
			}
		}
	};

	return RaceManager;
});
