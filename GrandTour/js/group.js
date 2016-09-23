define([], function () {
	var DROP_DISTANCE = .02;        // 14 meters

	function byDistance (a, b) {
		return b.getDistance() - a.getDistance();
	}

	function Group (options) {
		if (options === undefined) options = {};

		this.options = options;

		if (this.options && this.options.members) {
			for (var i = 0; i < this.options.members; i++) {
				this.addRider(this.options.members[i]);
			}
		} else
			this.options.members = [];

		if (this.options.timeInFront === undefined)
			this.options.timeInFront = 10;

		if (this.options.effort == undefined) {
			if (this.options.members.length) {
				this.options.effort = { power: this.options.members[0].getCurrentPower() };
			}
		}

		this.reset();
	}

	Group.prototype = {
		getName: function () {
			return this.options.name == undefined ? "Group" : this.options.name;
		},

		reset: function () {
			this.currentLeaderIndex = 0;
			this.timeInFront = 0;
			this.hasSteppedThisTurn = false;

			this.setInitialGroupOrder();
		},

		addRider: function (rider) {
			this.options.members.push(rider);
			rider.setGroup(this);

			this.setInitialGroupOrder();
		},

		hasStepped: function () {
			return this.hasSteppedThisTurn;
		},

		clearStepped: function () {
			this.hasSteppedThisTurn = false;
		},

		markStepped: function () {
			this.hasSteppedThisTurn = true;
		},

		convertToLeaderTime: function (leader, tick) {
			var holdTime = leader.options.timeInFrontPercent == undefined ? 0 : ((leader.options.timeInFrontPercent - 100) / 100) * this.options.timeInFront;
			if (holdTime == 0) return tick;

			var half = Math.floor(this.options.timeInFront * .5);
			if (tick < half) return tick;
			else if (tick < half + holdTime) return half;
			else return tick - holdTime;
		},

		prestep: function (raceManager) {
			// check for dropped riders here (10 meters behind last rider?)
			var riders = this.getRidersInOrder();
			if (riders.length > 1) {
				var last = riders[riders.length - 1];
				var next_to_last = riders[riders.length - 2];
				if (next_to_last.getDistance() - last.getDistance() >= DROP_DISTANCE) {
					console.log("Drop " + last.options.name + " from " + this.getName() + " at " + last.getDistance());
					this.dropRider(last);
				}
			}
		},

		step: function (raceManager) {
			this.prestep();

			var leader = this.getGroupLeader();
			var thisMapDistance = raceManager.getStageDistance();
			var d = leader.getDistance();
			var gradient = raceManager.getGradientAtDistance(d);

			var cooperating = this.getNumCooperating();

			var leaderAngle = -180 + leader.orderInGroup * (360 / cooperating);
			var tf = this.convertToLeaderTime(leader, this.timeInFront);
			leaderAngle += (360 / cooperating / this.options.timeInFront) * tf;

			var frontPos = this.getCooperatingAveragePosition() + leader.getDistanceFromPower(this.options.effort.power, gradient);

			leader.stats.pulls++;

			var noncoop = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					if (!rider.isFinished()) {
						d = rider.getDistance();
						distanceToFinish = thisMapDistance - d;
						gradient = raceManager.getGradientAtDistance(d);

						var degrees = rider.orderInGroup * (360 / cooperating) - leaderAngle;
						var radius = .003 * cooperating * .5;
						var desiredPos = frontPos + Math.sin(degrees / 180 * Math.PI) * radius;
						rider.y = Math.cos(degrees / 180 * Math.PI) * 40;

						rider.extra = Math.round(desiredPos * 1000);

						this.adjustPowerToReachPosition(rider, desiredPos, gradient);

						rider.step(gradient, distanceToFinish);
					}
				} else {
					if (!rider.isFinished()) {
						var desiredPos = frontPos - ((cooperating + noncoop) * .003);
						noncoop++;

						rider.y = -25;

						rider.extra = Math.round(desiredPos * 1000);

						d = rider.getDistance();
						distanceToFinish = thisMapDistance - d;
						gradient = raceManager.getGradientAtDistance(d);

						this.adjustPowerToReachPosition(rider, desiredPos, gradient);

						rider.step(gradient, distanceToFinish);
					}
				}

				rider.stats.nondrafting += rider.isDrafting() ? 0 : 1;
				rider.stats.drafting += rider.isDrafting() ? 1 : 0;
			}

			this.timeInFront++;

			this.updateGroupLeader();

			this.markStepped();
		},

		adjustPowerToReachPosition: function (rider, distance, gradient) {
			var d0 = rider.getDistance();

			var diff = distance - d0;

			var power;

			if (diff > 0) {
				// speed up
				power = rider.lookupPowerForDistance(diff, gradient);
			} else {
				// slow down
				var speed_to_maintain = this.getGroupMinCurrentSpeed();
				power = rider.lookupPowerForDistance(speed_to_maintain, gradient);
			}

			if (rider.isDrafting()) {
				// drafting reduces actual power requirement [but power is not linear and this could make them go slower]
				power *= Rider.DRAFT_PERCENT;
			}

			// don't work too hard!
			if (this.options.effort && this.options.effort.power && power > this.options.effort.power) {
				power = this.options.effort.power;
			}

			rider.setEffort({ power: power });
		},

		endStep: function () {
			this.clearStepped();
		},

		updateGroupLeader: function () {
			var leader = this.getGroupLeader();
			var leaderTime = leader.options.timeInFrontPercent == undefined ? this.options.timeInFront : this.options.timeInFront * Math.floor(leader.options.timeInFrontPercent / 100.0);
			if (this.timeInFront >= leaderTime) {
				var coop = this.getNumCooperating();
				this.currentLeaderIndex = (this.currentLeaderIndex + 1) % coop;
				this.timeInFront = 0;
			}
		},

		getGroupLeader: function () {
			var counter = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating() && counter == this.currentLeaderIndex)
					return rider;
				else
					counter++;
			}

			// no current leader (maybe he got dropped?)
			this.currentLeaderIndex = 0;
			return this.options.members[this.currentLeaderIndex];
		},

		setInitialGroupOrder: function () {
			var cooperating = this.getNumCooperating();

			var noncoop = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					rider.orderInGroup = i;
				} else {
					rider.orderInGroup = cooperating + (noncoop++);
				}
			}
		},

		getNumCooperating: function () {
			var cooperating = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) cooperating++;
			}
			return cooperating;
		},

		disband: function () {
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				rider.setGroup(undefined);
			}
		},

		dropRider: function (rider) {
			var index = this.options.members.indexOf(rider);
			if (index != -1) {
				this.options.members.splice(index, 1);
				rider.setGroup(undefined);

				// if there's only one rider left, the group will be disbanded by the racemanager
			}
		},

		hasRider: function (rider) {
			return this.options.members.indexOf(rider) != -1;
		},

		getSize: function () {
			return this.options.members.length;
		},

		setOptions: function (options) {
			if (options.effort) {
				this.options.effort = options.effort;
			}

			if (options.timeInFront) {
				this.options.timeInFront = options.timeInFront;
			}
		},

		getAverageFinishTime: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getTime();
			}

			var avg = total / this.options.members.length;

			return avg;
		},

		getGroupAveragePosition: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getDistance();
			}

			var avg = total / this.options.members.length;

			return avg;
		},

		getCooperatingAveragePosition: function () {
			var total = 0;
			var num = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					total += rider.getDistance();
					num++;
				}
			}

			var avg = total / num;

			return avg;
		},

		getGroupAverageSpeed: function () {
			var total = 0;

			$.each(this.options.members, function (index, rider) {
				total += rider.getAverageSpeed();
			});

			return total / this.options.members.length;
		},

		getGroupAverageCurrentSpeed: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getCurrentSpeed();
			}

			var avg = total / this.options.members.length;

			return avg;
		},

		getGroupMinCurrentSpeed: function () {
			var min = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				if (min == undefined || this.options.members[i].getCurrentSpeed() < min) {
					min = this.options.members[i].getCurrentSpeed();
				}
			}

			return min;
		},

		getGroupMaxPosition: function () {
			var max = undefined;

			for (var i = 0; i < this.options.members.length; i++) {
				if (this.options.members[i].getDistance() > max || max == undefined) {
					max = this.options.members[i].getDistance();
				}
			}

			return max;
		},

		// in meters
		getDistanceBetween: function () {
			var min = undefined, max = undefined;
			for (var i = 0; i < this.options.members.length; i++) {
				var d = this.options.members[i].getDistance();
				if (d < min || min == undefined) {
					min = d;
				}
				if (d > max || max == undefined) {
					max = d;
				}
			}

			return (max - min) * 1000;
		},

		getPowerSetting: function () {
			return this.options.effort.power;
		},

		setEffort: function (options) {
			this.options.effort = options;
		},

		getRemainingFuel: function () {
			var total = 0;

			$.each(this.options.members, function (index, rider) {
				total += rider.getFuelPercent();
			});

			return total / this.options.members.length;
		},

		showStats: function () {
			$.each(this.options.members, function (index, rider) {
				rider.showStats();
			});

			var s = (this.options.name == undefined ? "  Group: " : "  " + this.options.name + " Group: ") + "Avg Speed: " + (Math.round(this.getGroupAverageSpeed() * 10) / 10) + "kmh  Avg Fuel: " + Math.round(this.getRemainingFuel()) + "%";

			console.log(s);
		},

		clearExtraStats: function () {
			$.each(this.options.members, function (index, rider) {
				rider.clearExtraStats();
			});
		},

		getRiders: function () {
			return this.options.members;
		},

		getRidersInOrder: function () {
			var riders = this.options.members.slice().sort(byDistance);
			return riders;
		}
	};

	return Group;
});