define(["map", "rider"], function (Map, Rider) {
	function byDistance (a, b) {
		return (b.currentDistance - a.currentDistance);
	}

	function RaceManager (options) {
		this.options = options;

		this.map = new Map({ canvas: this.options.canvas, gpx: this.options.gpx, onLoaded: $.proxy(this.onMapLoaded, this) });

		this.distanceTraveled = 0;
		this.elapsedTime = 0;
		this.riders = [];
	}

	RaceManager.prototype.onMapLoaded = function () {
		if (this.options.onMapLoaded) {
			this.options.onMapLoaded();
		}
	};

	RaceManager.prototype.noWinner = function () {
		for (var i = 0; i < this.riders.length; i++) {
			var r = this.riders[i];
			if (r.currentDistance > this.map.distance) {
				return false;
			}
		}
		return true;
	};

	RaceManager.prototype.addRider = function (params) {
		var r = new Rider(params);
		this.riders.push(r);

		this.map.addMarkerForRider(r.number, r.name);
	};

	RaceManager.prototype.turn = function (options) {
		// sort riders front to back
		// in order, calc desired power
		// find speed for this turn and possible distance traveled
		// check for clear path, including formation
		// if path is clear, set new position
		// else, find distance traveled (rider may have to apply brakes if path is not clear or curve is too sharp, etc.)
		// do next rider

		this.riders.sort(byDistance);

		var timeslice = options.secondsPerTurn;

		this.elapsedTime += timeslice;

		$.each(this.riders, $.proxy(this.stepRider, this, timeslice));
	};

	RaceManager.prototype.stepRider = function (timeslice, index, rider) {
		var gradient = this.map.getGradientAtDistance(rider.currentDistance);

		rider.step({ gradient: gradient, timeslice: timeslice });

		var d = this.getNewPositionForRider(rider);

		this.map.showRiderOnMap(rider.number, rider.currentDistance);

		/*
		if (rider.number == 31) {
			this.map.moveMarkerTo(rider.currentDistance);
		}
		*/
	};

	/*
	RaceManager.prototype.turn = function () {
		var froome = this.riders[0];

		froome.gradient = .05;
		var p = froome.calculatePower();
		console.log("power = " + p);

		froome.gradient = .04;
		var s = froome.calculateSpeed(310);
		console.log("speed = " + s);

		this.distanceTraveled += 1000;

		this.map.moveMarkerTo(this.distanceTraveled);
	};
	*/

	RaceManager.prototype.getRiderByNumber = function (number) {
		for (var i = 0; i < this.riders.length; i++) {
			if (this.riders[i].number == number) return this.riders[i];
		}

		return null;
	};

	RaceManager.prototype.setRiderExertion = function (number, level) {
		var r = this.getRiderByNumber(number);
		if (r) {
			r.setExertionLevel(level);
		}
	};

	RaceManager.prototype.getNewPositionForRider = function (rider) {
		// TODO: this should take formation, map, curves, and traffic into account

		rider.currentDistance += rider.desiredDistanceChange;

		rider.currentSpeed = rider.desiredSpeed;
	};

	RaceManager.prototype.getRiders = function (array) {
		var returnArray = $.map(this.riders, function (element, index) {
			if (array.indexOf(element.number) != -1)
				return element;
			else
				return null;
		});

		return returnArray;
	};

	RaceManager.prototype.getElevationAtDistance = function (distance) {
		return this.map.getElevationAtDistance(distance);
	};

	return RaceManager;
});
