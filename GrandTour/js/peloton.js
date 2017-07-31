define(["jquery", "./group"], function ($, Group) {
	function Peloton (options) {
		var opts = {};

		$.extend(opts, options, { effort: { power: 300 }, paceline: false });

		Group.call(this, opts);

		return (this);
	}

	Peloton.prototype = Object.create(Group.prototype);

	$.extend(Peloton.prototype, {
		getName: function () {
			return "Peloton";
		},

		getGroupLeader: function () {
			var min = undefined, leader = undefined;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				var order = rider.getOrderInGroup();
				if (order < min || min == undefined) {
					min = order;
					leader = rider;
				}
			}

			return leader;
		},

		step: function (raceManager) {
			Group.prototype.prestep.call(this, raceManager);

			var leader = this.getGroupLeader();
			var thisMapDistance = raceManager.getStageDistance();
			var d = leader.getDistance();
			var gradient = raceManager.getGradientAtDistance(d);

			var frontPos = d + leader.getDistanceFromPower(this.options.effort.power, gradient);
			var leaderOrder = leader.getOrderInGroup();

			leader.stats.pulls++;

			// sort riders by distance
			var ridersInOrder = this.options.members.sort(Rider.sortByDistance);

			for (var i = 0; i < ridersInOrder.length; i++) {
				var rider = ridersInOrder[i];
				if (!rider.isFinished()) {
					var desiredPos = frontPos + ((leaderOrder - rider.orderInGroup) * .003);

					rider.extra = Math.round(desiredPos * 1000);

					d = rider.getDistance();
					distanceToFinish = thisMapDistance - d;
					gradient = raceManager.getGradientAtDistance(d);

					this.adjustPowerToReachPosition(rider, desiredPos, gradient);

					rider.step(gradient, distanceToFinish);

					rider.x = raceManager.findFreeRoadInRange(rider, d, rider.getDistance(), rider.x);
					if (rider.x == undefined) {
						console.log("blocked");
					}

					rider.stats.nondrafting += rider.isDrafting() ? 0 : 1;
					rider.stats.drafting += rider.isDrafting() ? 1 : 0;
				}
			}

			this.markStepped();
		}
	});

	return (Peloton);
});
