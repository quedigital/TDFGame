define([], function () {
	function Group (options) {
		this.options = options;

		if (this.options && this.options.members)
			this.options.members = this.options.members.slice();

		this.reset();
	}

	Group.prototype = {
		reset: function () {
			this.currentLeaderIndex = 0;
			this.timeInFront = 0;
			this.hasSteppedThisTurn = false;
			this.counter = 0;

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

		step: function (raceManager) {
			// THEORY: leader steps and followers try to keep up
			var leader = this.getGroupLeader();

			var d = leader.getDistance();
			var thisMapDistance = raceManager.getStageDistance();
			var distanceToFinish = thisMapDistance - d;
			var gradient = raceManager.getGradientAtDistance(d);

			var frontPos = this.getGroupMaxPosition() + leader.getDistanceFromPower(this.options.effort.power, gradient);// * 1.3595;
			leader.extra = Math.round(frontPos * 1000);
			this.adjustPowerToMaintainPosition(leader, frontPos, gradient);
			if (this.options.effort) {
				leader.setEffort(this.options.effort);
			}

			leader.step(gradient, distanceToFinish);

			leader.stats.pulls++;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider != leader) {
					d = rider.getDistance();
					distanceToFinish = thisMapDistance - d;
					gradient = raceManager.getGradientAtDistance(d);

					var desiredPos = frontPos - .004 * rider.orderInGroup;
					rider.extra = Math.round(desiredPos * 1000);

					this.adjustPowerToMaintainPosition(rider, desiredPos, gradient);

					rider.step(gradient, distanceToFinish);
				}
			}

			this.timeInFront++;

			if (this.timeInFront >= 30) {
				this.switchLeaders();
				this.timeInFront = 0;
			}

			this.markStepped();
		},

		endStep: function () {
			this.clearStepped();
		},

		getGroupLeader: function () {
			return this.options.members[this.currentLeaderIndex];
		},

		setInitialGroupOrder: function () {
			var cooperating = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) cooperating++;
			}

			var counter = 0;
			var noncoop = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					rider.orderInGroup = counter++;
				} else {
					rider.orderInGroup = cooperating + (++noncoop);
				}
			}
		},

		switchLeaders: function () {
			this.counter++;

			var cooperating = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) cooperating++;
			}

			var noncoop = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (!rider.isCooperating()) {
					rider.orderInGroup = cooperating + (++noncoop);
				}
			}

			// find next cooperating rider (or stay with this leader if no one is cooperating)
			for (var i = 1; i < this.options.members.length; i++) {
				var temp = (this.currentLeaderIndex + i) % this.options.members.length;
				var rider = this.options.members[temp];
				if (rider.isCooperating()) {
					this.currentLeaderIndex = temp;
					rider.orderInGroup = 0;
					for (var j = 1; j < this.options.members.length; j++) {
						var rider2 = this.options.members[(temp + j) % this.options.members.length];
						if (rider2.isCooperating()) {
							rider2.orderInGroup = j;
						}
					}
					break;
				}
			}
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
		},

		adjustPowerToMaintainPosition: function (rider, distance, gradient) {
			// TODO: smooth these out using better logic, easing, etc.
			var d0 = rider.getDistance();

			var diff = distance - d0;

			var power;

			if (diff > 0) {
				// speed up
				power = rider.lookupPowerForDistance(diff, gradient);
			} else {
				// slow down
				//var speed_to_maintain = this.getGroupLeader().currentSpeed;
				var speed_to_maintain = rider.currentSpeed;
				power = rider.lookupPowerForDistance(speed_to_maintain, gradient);
				//power = 0;
			}

			// don't work too hard!
			if (this.options.effort && this.options.effort.power && power > this.options.effort.power) {
				power = this.options.effort.power;
			}

			// drafting reduces actual power requirement [but power is not linear and this made them go slower]
			//power *= Rider.DRAFT_PERCENT;

			rider.setEffort({ power: power });
		},

		getGroupAveragePosition: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getDistance();
			}

			var avg = total / this.options.members.length;

			return avg;
		},

		getGroupAverageSpeed: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getCurrentSpeed();
			}

			var avg = total / this.options.members.length;

			return avg;
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
		}
	};

	return Group;
});