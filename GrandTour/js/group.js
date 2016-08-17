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

			var pos = this.getAveragePosition();

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider != leader) {
					d = rider.getDistance();
					distanceToFinish = thisMapDistance - d;
					gradient = raceManager.getGradientAtDistance(d);

					this.getRiderTo(rider, pos);

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
			this.currentLeaderIndex = (this.currentLeaderIndex + 1) % this.options.members.length;
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

		getRiderTo: function (rider, distance) {
			// TODO: smooth these out using better logic, easing, etc.
			var d1 = rider.getDistance();

			var sp1 = rider.getCurrentSpeed();
			var p1 = rider.getCurrentPower();

			if (d1 + (sp1 *.9) < distance) {
				var new_power = Math.round(p1 + 30);
				rider.setEffort({ power: new_power });
				if (rider.options.name.substr(0, 3) == "GTT") {
					//console.log("upping to " + new_power);
				}
			} else if (d1 + (sp1 * 2) > distance) {
				var new_power = Math.round(p1 - 10);
				rider.setEffort({ power: new_power });
				if (rider.options.name.substr(0, 3) == "GTT") {
					//console.log("coasting to " + new_power);
				}
			}
		},

		getAveragePosition: function () {
			var total = 0;

			for (var i = 0; i < this.options.members.length; i++) {
				total += this.options.members[i].getDistance();
			}

			return (total / this.options.members.length);
		}
	};

	return Group;
});