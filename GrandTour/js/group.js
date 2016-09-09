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
			this.lastLeader = undefined;

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

			if (leader != this.lastLeader) {
				leader.timeInFrontCount = 0;
				leader.timeInFrontExtra = 0;
				leader.timeInFrontPassed = false;
				this.lastLeader = leader;
			}

			var d = leader.getDistance();
			var thisMapDistance = raceManager.getStageDistance();
			var gradient = raceManager.getGradientAtDistance(d);

//			var frontPos = this.getGroupAveragePosition() + leader.getDistanceFromPower(this.options.effort.power, gradient);
			var frontPos = this.getCooperatingAveragePosition() + leader.getDistanceFromPower(this.options.effort.power, gradient);

			leader.stats.pulls++;

			var cooperating = this.getNumCooperating();
			var noncoop = 0;

			var incrementTimer = true;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (rider.isCooperating()) {
					if (!rider.isFinished()) {
						d = rider.getDistance();
						distanceToFinish = thisMapDistance - d;
						gradient = raceManager.getGradientAtDistance(d);

						var degreesPerTick = 360 / (cooperating * this.options.timeInFront);
						var riderAngle = 360 / cooperating;
						var degrees = (rider.orderInGroup * riderAngle) - (this.timeInFront * degreesPerTick);
						var radius = .003 * cooperating * .5;

						var desiredPos = frontPos + Math.sin(degrees / 180 * Math.PI) * radius;
						rider.y = Math.cos(degrees / 180 * Math.PI) * 40;

						rider.extra = Math.round(desiredPos * 1000);

						this.adjustPowerToReachPosition(rider, desiredPos, gradient);

						rider.step(gradient, distanceToFinish);

						//rider.overrideDistance(desiredPos);

						if (rider == leader) {
							// riders can take longer turns at the front [but not shorter]
							var percent = rider.options.timeInFrontPercent === undefined ? 1.0 : (rider.options.timeInFrontPercent / 100.0);
							if (percent > 1) {
								var totalTickCount = percent * this.options.timeInFront;
								var half = Math.floor(this.options.timeInFront * .5);
								if (rider.timeInFrontCount == half && !rider.timeInFrontPassed) {
									incrementTimer = false;
									rider.timeInFrontExtra++;
									if (rider.timeInFrontCount * 2 + rider.timeInFrontExtra >= totalTickCount) {
										rider.timeInFrontPassed = true;
										incrementTimer = true;
									}
								}
								if (incrementTimer)
									rider.timeInFrontCount++;
							}
						}
					}
				} else {
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

			if (incrementTimer)
				this.timeInFront++;

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
				var speed_to_maintain = this.getGroupMinSpeed();
				power = rider.lookupPowerForDistance(speed_to_maintain, gradient);
			}

			if (rider != this.getGroupLeader()) {
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

		getGroupLeader: function () {
			var coop = this.getNumCooperating();

			// return the rider mathematically-in-the-front by timing
			// 2 riders = offset 0
			// 3 riders = offset 3
			// 4 riders = offset 5
			// 5 riders = offset 7? 8?

			var offset = 7;// + ((coop - 1) / coop);
			var rider = Math.floor((this.timeInFront + this.options.timeInFront + offset) / this.options.timeInFront) % coop;
			return this.options.members[rider];

			/* I tried using front-rider but the results came back skewed for some reason
			var max = undefined;
			var leader = undefined;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (max == undefined || rider.distance > max) {
					max = rider.distance;
					leader = i;
				}
			}

			return this.options.members[leader];
			*/
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

		getRemainingFuel: function () {
			var total = 0;

			$.each(this.options.members, function (index, rider) {
				total += rider.getFuelPercent();
			});

			return total;
		},

		showStats: function () {
			$.each(this.options.members, function (index, rider) {
				rider.showStats();
			});

			var s = "Avg Speed: " + (Math.round(this.getGroupAverageSpeed() * 10) / 10) + "kmh  Fuel: " + Math.round(this.getRemainingFuel()) + "%";

			console.log(s);
		}
	};

	return Group;
});