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

			if (this.options.effort) {
				leader.setEffort(this.options.effort);
			}

			leader.step(gradient, distanceToFinish);
			leader.stats.pulls++;

			var pos = this.getGroupPosition();

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider != leader) {
					d = rider.getDistance();
					distanceToFinish = thisMapDistance - d;
					gradient = raceManager.getGradientAtDistance(d);

					this.adjustPowerToMaintainPosition(rider, pos, gradient);

					rider.step(gradient, distanceToFinish);
				}
			}

			this.timeInFront++;

			if (this.timeInFront >= 10) {
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

		switchLeaders: function () {
			// find next cooperating rider (or stay with this leader if no one is cooperating)
			for (var i = 1; i < this.options.members.length; i++) {
				var temp = (this.currentLeaderIndex + i) % this.options.members.length;
				var rider = this.options.members[temp];
				if (rider.isCooperating()) {
					this.currentLeaderIndex = temp;
					if (rider.options.name.substr(0, 1) == "B") {
						//console.log("switching to " + temp);
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

			if (diff > 0) {
				var power = rider.lookupPowerForDistance(diff, gradient);
				rider.setEffort({ power: power });
			} else {
				// slow down?
				rider.setEffort({ power: 0 });
			}
		},

		// this is a tricky function; it determines a lot of the energy expenditure of groups
		// I'm trying now to define the group's position as the current leader's position
		// group's position is defined by max position, with a bit of the group's average position factored in too
		// with a balance between riders expending too much effort to "get to the front"
		getGroupPosition: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getDistance();
			}

			var avg = total / this.options.members.length;

			var max = undefined;
			for (var i = 0; i < this.options.members.length; i++) {
				var d = this.options.members[i].getDistance();
				if (d > max || max == undefined) {
					max = d;
				}
			}

			//return this.getGroupLeader().getDistance();
			//return max * .995 + avg * 0.005;
			//return max * .3 + avg * .7;
			return avg;
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