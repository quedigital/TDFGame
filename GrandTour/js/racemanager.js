define(["underscore", "group"], function (_, Group) {
	function RaceManager (options) {
		this.options = options != undefined ? options : {};

		this.started = false;
		this.running = false;

		this.riders = [];
		this.time = 0;

		this.groups = [];

		this.views = [];
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

		getRiders: function () {
			return this.riders;
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
			if (!this.started) {
				this.initializeViews();

				this.started = true;
			}

			var i;

			var thisMapDistance = this.getStageDistance();

			var allFinished = true;

			for (i = 0; i < this.riders.length; i++) {
				var rider = this.riders[i].rider;

				if (!rider.isFinished()) {
					if (rider.isInGroup()) {
						var group = rider.getGroup();
						if (group && !group.hasStepped()) {
							group.step(this);
						}
					} else {
						var d = rider.getDistance();
						var distanceToFinish = thisMapDistance - d;
						var gradient = this.map.getGradientAtDistance(d);

						rider.step(gradient, distanceToFinish);
					}

					if (rider.getDistance() >= thisMapDistance) {
						rider.setFinished(true);
					} else {
						allFinished = false;
					}
				}

				if (!options.nogui)
					this.updateGUI(rider, riderObj.gui);
			}

			for (i = 0; i < this.groups.length; i++) {
				var group = this.groups[i];
				group.endStep();
			}

			this.updateViews();

			if (allFinished) {
				this.stop();
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

		findGroupWith: function (rider) {
			for (var i = 0; i < this.groups.length; i++) {
				if (this.groups[i].hasRider(rider))
					return this.groups[i];
			}

			return undefined;
		},

		getStageDistance: function () {
			if (this.map) return this.map.getTotalDistance();
			else return undefined;
		},

		getGradientAtDistance: function (distance) {
			return this.map.getGradientAtDistance(distance);
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
			var target, time_target;

			if (opts.hours) {
				time_target = opts.hours * 60 * 60;
			}

			if (opts.meters) {
				var dist = opts.meters;
				if (dist < 0)
					target = this.getStageDistance() + (dist / 1000);
				else
					target = dist / 1000;
			} else if (opts.km) {
				var dist = opts.km;
				if (dist < 0)
					target = this.getStageDistance() + dist;
				else
					target = dist;
			} else if (opts.percent) {
				target = this.getStageDistance() * (opts.percent / 100);
			}

			if (target != undefined) {
				do {
					this.doStep({nogui: true});

					var leader = this.getLeadingRider();
					if (leader) lead = leader.getDistance();
				} while (leader != undefined && lead < target)
			} else if (time_target != undefined) {
				do {
					this.doStep({nogui: true});
				} while (this.time < time_target)
			}
		},

		makeGroup: function (options) {
			var riderArray = options.members;

			var g = new Group(options);

			for (var i = 0; i < riderArray.length; i++) {
				var rider = riderArray[i];
				rider.setGroup(g);
			}

			this.groups.push(g);

			return g;
		},

		dropFromGroup: function (rider) {
			for (var i = 0; i < this.groups.length; i++) {
				var group = this.groups[i];
				if (group.hasRider(rider)) {
					group.dropRider(rider);

					// if there's only one other person in this group, disband the group
					var sz = group.getSize();
					if (group.getSize() == 1) {
						this.disbandGroup(group);
						break;
					}
				}
			}
		},

		disbandGroup: function (group) {
			for (var i = 0; i < this.groups.length; i++) {
				if (this.groups[i] == group) {
					group.disband();
					this.groups.splice(i, 1);
					break;
				}
			}
		},

		// returns estimated time between (if still riding) or difference between finishing times
		getTimeGapBetween: function (rider1, rider2) {
			var gap;

			// TODO: is there a more sophisticated way of doing this?
			if (!rider1.isFinished() && !rider2.isFinished()) {
				var d1 = rider1.getDistance();
				var d2 = rider2.getDistance();
				var d = d1 - d2;
				if (d > 0) {
					var sp = rider2.getCurrentSpeed();
					gap = d / rider2.getCurrentSpeed();
				} else {
					gap = -d / rider1.getCurrentSpeed();
				}
			} else {
				gap = Math.abs(rider1.getTimeInSeconds() - rider2.getTimeInSeconds());
			}

			return gap;
		},

		getDistanceBetween: function (rider1, rider2) {
			return Math.abs(rider1.getDistance() - rider2.getDistance());
		},

		addView: function (view) {
			this.views.push(view);
		},

		updateViews: function () {
			var me = this;

			_.each(this.views, function (view, index) {
				view.step(me);
			});
		},

		initializeViews: function () {
			var me = this;

			_.each(this.views, function (view, index) {
				view.initialize(me);
			});
		}
	};

	return RaceManager;
});
