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

		step: function (raceManager) {
			Group.prototype.prestep.call(this, raceManager);

			var leader = this.getGroupLeader();
			var thisMapDistance = raceManager.getStageDistance();
			var d = leader.getDistance();
			var gradient = raceManager.getGradientAtDistance(d);

			var frontPos = d + leader.getDistanceFromPower(this.options.effort.power, gradient);

			leader.stats.pulls++;

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				if (!rider.isFinished()) {
					var desiredPos = frontPos - (rider.orderInGroup * .003);

					rider.y = -25;

					rider.extra = Math.round(desiredPos * 1000);

					d = rider.getDistance();
					distanceToFinish = thisMapDistance - d;
					gradient = raceManager.getGradientAtDistance(d);

					this.adjustPowerToReachPosition(rider, desiredPos, gradient);

					rider.step(gradient, distanceToFinish);
				}
			}

			this.markStepped();
		}
	});

	return (Peloton);
});
