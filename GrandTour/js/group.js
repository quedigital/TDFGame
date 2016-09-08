define([], function () {
	function Group (options) {
		if (options === undefined) options = {};

		this.options = options;

		if (this.options && this.options.members)
			this.options.members = this.options.members.slice();

		if (this.options.timeInFront === undefined)
			this.options.timeInFront = 10;

		this.reset();
	}

	Group.prototype = {
		reset: function () {
			//this.currentLeaderIndex = 0;
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

			var frontPos = this.getGroupMaxPosition() + leader.getDistanceFromPower(this.options.effort.power, gradient);

			leader.stats.pulls++;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				d = rider.getDistance();
				distanceToFinish = thisMapDistance - d;
				gradient = raceManager.getGradientAtDistance(d);

				var desiredPos = frontPos;
				if (rider != leader) {
					//var percent = this.timeInFront / 10.0;
					desiredPos = frontPos - (.003 * Math.abs(rider.orderInGroup));
//					desiredPos = (desiredPos *1 + rider.distance *0);
//					desiredPos = (desiredPos *.9 + rider.distance *.1);
					//desiredPos = rider.distance + (desiredPos - rider.distance) * percent;
				}
				rider.extra = Math.round(desiredPos * 1000);

				this.adjustPowerToReachPosition(rider, desiredPos, gradient);

				var lastDistance = rider.distance;

				rider.step(gradient, distanceToFinish);

				// hack to ignore power-rounding issues; jump straight to the desired position [this was necessary to conserve energy; not sure it's the best solution]
				// try setting the desired position in 10 frames?
				var error = rider.distance - desiredPos;
				if (Math.abs(error) > .001) {
					//debugger;
					//rider.distance = lastDistance;
					//this.adjustPowerToReachPosition(rider, desiredPos, gradient);
				}
				//rider.overrideDistance(desiredPos);
				rider.error += Math.abs(rider.distance - desiredPos);
			}

			this.timeInFront++;

			if (this.timeInFront >= this.options.timeInFront) {
				this.switchLeaders();
				this.timeInFront = 0;
			}

			this.markStepped();
		},

		adjustPowerToReachPosition: function (rider, distance, gradient) {
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
				var speed_to_maintain = this.getGroupMinSpeed();
				//var speed_to_maintain = rider.currentSpeed;
				power = rider.lookupPowerForDistance(speed_to_maintain, gradient);
				//power = 100;
			}

			if (rider != this.getGroupLeader()) {
				// drafting reduces actual power requirement [but power is not linear and this made them go slower]
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

		getGroupLeader: function () {
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.orderInGroup == 0) return rider;
			}

			// shouldn't get here
			return this.options.members[0];
			//return this.options.members[this.currentLeaderIndex];
		},

		setInitialGroupOrder: function () {
			var cooperating = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) cooperating++;
			}

			var noncoop = 0;
			var half = Math.floor(cooperating * .5);
			var counter = half;
			var isEven = cooperating / 2 == Math.floor(cooperating / 2);

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					var index = counter--;
					if (index < -half + (isEven ? 1 : 0)) {
						index = half;
					}
					rider.orderInGroup = index;
				} else {
					rider.orderInGroup = cooperating + (++noncoop);
				}
			}
		},

		switchLeaders: function () {
			this.counter++;

			// find out who's cooperating
			var cooperating = 0;
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) cooperating++;
			}

			var noncoop = 0;
			var isEven = cooperating / 2 == Math.floor(cooperating / 2);

			// non-cooperative members go to the back
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (!rider.isCooperating()) {
					rider.orderInGroup = cooperating + (++noncoop);
				}
			}

			// THEORY: above zero means next in line; zero is current leader; below zero means they just went
			var half = Math.floor(cooperating * .5);
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				var index = rider.orderInGroup;
				index -= 1;
				if (index < -half + (isEven ? 1 : 0)) {
					index = half;
				}
				rider.orderInGroup = index;
			}

			/*
			// find next cooperating rider (or stay with this leader if no one is cooperating)
			for (var i = 1; i < this.options.members.length; i++) {
				var temp = (this.currentLeaderIndex + i) % this.options.members.length;
				var rider = this.options.members[temp];
				if (rider.isCooperating()) {
					this.currentLeaderIndex = temp;
					break;
				}
			}
			*/

			/*
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
			*/
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

		getGroupMinSpeed: function () {
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
		}
	};

	return Group;
});