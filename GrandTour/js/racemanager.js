define(["underscore", "group", "peloton"], function (_, Group, Peloton) {
	function sortByTime (a, b) {
		return a.time > b.time;
	}

	function RaceManager (options) {
		this.options = options != undefined ? options : {};

		this.started = false;
		this.running = false;
		this.finished = false;
		this.initialized = false;
		this.allInitialized = false;

		this.riders = [];
		this.teams = [];
		this.time = 0;

		this.peloton = new Peloton();

		this.groups = [this.peloton];

		this.views = [];

		this.frameInterval = (!options || options.interval == undefined) ? 10 : options.interval;
		this.currentFrameInterval = 0;
		this.frameDelay = (!options || options.delay == undefined) ? 0 : options.delay;

		this.paused = false;
	}

	RaceManager.prototype = {
		getFrameDelay: function () {
			return this.frameDelay;
		},

		addRider: function (rider) {
			this.riders.push(rider);

			this.peloton.addRider(rider);
		},

		addTeam: function (team) {
			this.teams.push(team);

			var riders = team.getRiders();

			for (var i = 0; i < riders.length; i++) {
				riders[i].setTeam(team);
				this.addRider(riders[i]);
			}
		},

		removeRider: function (rider) {
			for (var i = 0; i < this.riders.length; i++) {
				if (this.riders[i] == rider) {
					this.riders.splice(i, 1);
					break;
				}
			}
		},

		escapeRider: function (rider) {
			this.peloton.dropRider(rider);

			// if there's only one rider left in the peloton, drop him too
			if (this.peloton.getSize() == 1) {
				var rider = this.peloton.getRiders()[0];
				rider.setGroup(undefined);
			}
		},

		getRiders: function () {
			return this.riders;
		},

		setMap: function (map) {
			this.map = map;
		},

		// TODO: I don't think this function is used anymore
		go: function (callback) {
			debugger;
			if (!this.running) {
				this.options.stepCallback = callback;

				this.running = true;

				this.doStep( { automatic: true } );
			}
		},

		stop: function () {
			this.running = false;

			this.updateViews();
		},

		reset: function () {
			this.time = 0;
			this.running = false;
			this.finished = false;
			this.started = false;
			this.initialized = false;
			this.allInitialized = false;

			_.each(this.views, function (view, index) {
				view.reset();
			});

			_.each(this.riders, function (rider, index) {
				rider.reset();
			});
		},

		doStep: function (options) {
			if (this.paused) return;

			if (!this.initialized) {
				this.initializeViews();

				this.initialized = true;

				return;
			}

			if (this.views.length > 0 && !this.allInitialized) {
				return;
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

			i = 0;
			while (i < this.groups.length) {
				var group = this.groups[i];
				if (group.getSize() == 1) {
					this.disbandGroup(group);
				} else {
					group.endStep();
					i++;
				}
			}

			if (this.hasActiveViews()) {
				this.updateViews();
			}

			if (allFinished) {
				this.finished = true;
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

		getTimeElapsedAsString: function () {
			return String(this.getTimeElapsed()).toHHMMSS();
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

			if (this.target.callback && this.hasActiveViews()) {
				// async

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

					if (doTimeout)
						setTimeout($.proxy(this.runToTarget, this), this.frameDelay);
					else
						this.runToTarget();
				} else {
					if (this.target.callback) {
						this.target.callback();
					}
				}
			} else {
				// sync

				while (!allFinished) {
					if (!this.targetReached()) {
						allFinished = this.doStep();
					} else {
						allFinished = true;
					}
				}

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
				var previousGroup = rider.getGroup();
				if (previousGroup) {
					previousGroup.dropRider(rider);
				}
				rider.setGroup(g);
			}

			this.groups.push(g);

			return g;
		},

		joinWithRider: function (rider1, rider2) {
			if (rider1.isInGroup()) {
				rider1.getGroup().dropRider(rider1);
			}

			if (rider2.isInGroup()) {
				this.addToGroup(rider1, rider2.getGroup());
			} else {
				this.makeGroup( { members: [rider1, rider2] } );
			}
		},

		addToGroup: function (rider, group) {
			group.addRider(rider);
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

		hasActiveViews: function () {
			var active = $.map(this.views, function (view, index) {
				if (view.disabled != true) return view;
			});

			return active.length > 0;
		},

		initializedCallback: function (view) {
			var allInitialized = true;

			for (var i = 0; i < this.views.length; i++) {
				var v = this.views[i];
				if (v == view) {
					v.initialized = true;
				} else if (!v.initialized) {
					allInitialized = false;
				}

			}

			if (allInitialized) {
				this.allInitialized = true;
			}
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
		},

		togglePause: function () {
			this.paused = !this.paused;
		},

		getPeloton: function () {
			return this.peloton;
		},

		getPelotonRange: function () {
			return this.peloton.getDistanceBetween();
		},

		setPelotonEffort: function (options) {
			this.peloton.setEffort(options);
		},

		getPelotonSize: function () {
			return this.peloton.getSize();
		},

		getPelotonRidersInOrder: function () {
			return this.peloton.getRidersInOrder();
		},

		showStats: function () {
			for (var i = 0; i < this.riders.length; i++) {
				this.riders[i].showStats();
			}
		},

		isFinished: function () {
			return this.finished;
		},

		findFreeRoadInRange: function (rider, d1, d2, x) {
			var ROAD_HALF_WIDTH = 5;

			var blocked = [];

			function isBlocked (newX) {
				for (var j = 0; j < blocked.length; j++) {
					if (blocked[j] == newX)
						return true;
				}
				return false;
			}

			for (var i = 0; i < this.riders.length; i++) {
				var r = this.riders[i];
				if (r != rider && !r.isFinished()) {
					var d = r.getDistance();
					if (d >= d1 && d <= d2) {
						// in range
						blocked.push(this.riders[i].x);
					}
				}
			}

			var tryX, newX = undefined;

			var startX = 0;

			for (var xx = 0; xx < ROAD_HALF_WIDTH; xx += 1) {
				var tryX = startX + xx;
				if (isBlocked(tryX)) {
					tryX = startX - xx;
					if (!isBlocked(tryX)) {
						newX = tryX;
						break;
					}
				} else {
					newX = tryX;
					break;
				}
			}

			return newX;
		}
	};

	return RaceManager;
});
