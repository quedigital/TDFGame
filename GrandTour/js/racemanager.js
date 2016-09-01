define(["underscore", "group"], function (_, Group) {
	function sortByTime (a, b) {
		return a.time > b.time;
	}

	function RaceManager (options) {
		this.options = options != undefined ? options : {};

		this.started = false;
		this.running = false;

		this.riders = [];
		this.time = 0;

		this.groups = [];

		this.views = [];

		this.frameInterval = 10;
		this.currentFrameInterval = 0;
		this.frameDelay = 0;
	}

	RaceManager.prototype = {
		addRider: function (rider) {
			this.riders.push(rider);
		},

		removeRider: function (rider) {
			for (var i = 0; i < this.riders.length; i++) {
				if (this.riders[i] == rider) {
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

			_.each(this.riders, function (rider, index) {
				rider.reset();
			});
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
				var rider = this.riders[i];

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

				if (options.automatic) {
					setTimeout($.proxy(this.doStep, this), 100, options);
				}
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
				var rider = this.riders[i];
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

		runToFinish: function (opts) {
			if (opts && opts.callback) {
				// sync
				this.target = {callback: opts ? opts.callback : undefined};

				this.runToTarget();
			} else {
				this.target = {};

				// async
				do {
					var finished = this.doStep();
				} while (!finished);
			}
		},

		runTo: function (opts) {
			var target, time_target;

			if (opts.hours) {
				this.target = { time: opts.hours * 60 * 60 };
			}

			if (opts.meters) {
				var dist = opts.meters;
				if (dist < 0) {
					this.target = { meters: this.getStageDistance() + (dist / 1000) };
				} else {
					this.target = { meters: dist / 1000 };
				}
			} else if (opts.km) {
				var dist = opts.km;
				if (dist < 0) {
					this.target = { km: this.getStageDistance() + dist };
				} else {
					this.target = { km: dist };
				}
			} else if (opts.percent) {
				this.target = { meters: this.getStageDistance() * (opts.percent / 100) };
			}

			this.target.callback = opts.callback;

			this.runToTarget(opts);
		},

		targetReached: function () {
			if (this.target.meters) {
				var leader = this.getLeadingRider();
				if (leader) lead = leader.getDistance();

				if (leader != undefined && lead >= this.target.meters) return true;
			} else if (this.target.km) {
				var leader = this.getLeadingRider();
				if (leader) lead = leader.getDistance();

				if (leader != undefined && lead >= this.target.km) return true;
			} else if (this.target.time) {
				if (this.time >= this.target.time) return true;
			}

			return false;
		},

		runToTarget: function () {
			var allFinished = false;

			if (!this.targetReached()) {
				allFinished = this.doStep();
			} else {
				allFinished = true;
			}

			if (!allFinished) {
				var doTimeout = false;
				this.currentFrameInterval++;
				if (this.currentFrameInterval >= this.frameInterval) {
					doTimeout = true;
					this.currentFrameInterval = 0;
				}

				if (this.target.callback && doTimeout) {
					// async
					setTimeout($.proxy(this.runToTarget, this), this.frameDelay);
				} else {
					// sync
					this.runToTarget();
				}
			} else {
				if (this.target.callback) {
					this.target.callback();
				}
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

		getTimeGapBetween: function (rider1, rider2) {
			var r1 = Math.floor(rider1.getDistance());
			var r2 = Math.floor(rider2.getDistance());
			var t1, t2;

			if (r1 >= r2) {
				t1 = rider1.getTimeAt(r2);
				t2 = rider2.getTimeAt(r2);
			} else {
				t1 = rider1.getTimeAt(r1);
				t2 = rider2.getTimeAt(r1);
			}

			return t2 - t1;
		},

		getRiderAverageSpeedBetween: function (rider, distance1, distance2) {
			var d1, d2;

			if (distance1 < 0) {
				d1 = this.getStageDistance() + distance1;
				if (distance2 == 0) {
					d2 = this.getStageDistance();
				} else if (distance2 < 0) {
					d2 = this.getStageDistance() + distance2;
				} else {
					d2 = distance2;
				}
			} else {
				d1 = distance1;

				if (distance2 < 0) {
					d2 = this.getStageDistance() + distance2;
				} else if (distance2 == 0) {
					d2 = this.getStageDistance();
				} else
					d2 = distance2;
			}

			return rider.getAverageSpeedBetween(d1, d2);
		},

		// returns estimated time between (if still riding) or difference between finishing times
		getTimeGapBetween_old: function (rider1, rider2) {
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
		},

		getLeaderColor: function () {
			var v = this.views[0];
			if (v) {
				var rider = this.getLeadingRider();
				return v.getColorForRider(rider);
			}

			return undefined;
		},

		getStageFinishOrder: function () {
			var riders = this.riders.slice();
			return riders.sort(sortByTime);
		}
	};

	return RaceManager;
});
