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
		},

		step: function () {
			this.timeInFront++;

			if (this.timeInFront >= 10) {
				this.switchLeaders();
				this.timeInFront = 0;
			}
		},

		switchLeaders: function () {
			this.currentLeaderIndex = (this.currentLeaderIndex + 1) % this.options.members.length;

			var leader = this.options.members[this.currentLeaderIndex];

			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				rider.setGroupLeader(leader);
			}
		},

		disband: function () {
			for (var i = 0; i < this.options.members.length; i++) {
				var rider = this.options.members[i];
				rider.setGroupLeader(undefined);
			}
		},

		dropRider: function (rider) {
			var index = this.options.members.indexOf(rider);
			if (index != -1) {
				this.options.members.splice(index, 1);
				rider.setGroupLeader(undefined);
			}
		},

		hasRider: function (rider) {
			return this.options.members.indexOf(rider) != -1;
		},

		getSize: function () {
			return this.options.members.length;
		},

		setEffort: function (options) {
			if (options.power) {
				this.options.power = options.power;
			}
		},

		getPowerSetting: function () {
			var p = this.options.power;

			if (!p) {
				var leader = this.options.members[this.currentLeaderIndex];
				p = leader.getDesiredPower();
			}

			return p;
		}
	};

	return Group;
});