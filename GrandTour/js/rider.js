define(["d3"], function (d3) {
	// from https://mycurvefit.com/
	// for max power output (fits Andrei Greipel's numbers from the Tour of Flanders)
	// 2s   5s   60s    300s  1200s   6hrs (21600s)
	// 1600 1440 690    456   384     305

	// y = 324.3039 + (1814.825 - 324.3039)/(1 + Math.pow(x/17.07858, 0.8516406))
	//
	// y = 30.98474 + (9108.046 - 30.98474)/(1 + Math.pow(x/311.4249, 9.127851))
	//
	// where y = average power over duration and x = duration
	//
	// [these two don't work great for higher wattages – but for everything else they're great]

	// or:
	//
	// y = 7644193000000000*Math.pow(x,-4.910782)
	// [this one might be worth using]

	// or:

	// y = 1850683 + (-4.99992 - 1850683)/(1 + Math.pow(x/111022600, 1.000014))
	// where x = watts
	//       y = multiplier of watts

	// from http://stackoverflow.com/questions/27176423/function-to-solve-cubic-equation-analytically
	function cuberoot(x) {
		var y = Math.pow(Math.abs(x), 1/3);
		return x < 0 ? -y : y;
	}

	function solveCubic (a, b, c, d) {
		if (Math.abs(a) < 1e-8) { // Quadratic case, ax^2+bx+c=0
			a = b; b = c; c = d;
			if (Math.abs(a) < 1e-8) { // Linear case, ax+b=0
				a = b; b = c;
				if (Math.abs(a) < 1e-8) // Degenerate case
					return [];
				return [-b/a];
			}

			var D = b*b - 4*a*c;
			if (Math.abs(D) < 1e-8)
				return [-b/(2*a)];
			else if (D > 0)
				return [(-b+Math.sqrt(D))/(2*a), (-b-Math.sqrt(D))/(2*a)];
			return [];
		}

		// Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
		var p = (3*a*c - b*b)/(3*a*a);
		var q = (2*b*b*b - 9*a*b*c + 27*a*a*d)/(27*a*a*a);
		var roots;

		if (Math.abs(p) < 1e-8) { // p = 0 -> t^3 = -q -> t = -q^1/3
			roots = [cuberoot(-q)];
		} else if (Math.abs(q) < 1e-8) { // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
			roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
		} else {
			var D = q*q/4 + p*p*p/27;
			if (Math.abs(D) < 1e-8) {       // D = 0 -> two roots
				roots = [-1.5*q/p, 3*q/p];
			} else if (D > 0) {             // Only one real root
				var u = cuberoot(-q/2 - Math.sqrt(D));
				roots = [u - p/(3*u)];
			} else {                        // D < 0, three roots, but needs to use complex numbers/trigonometric solution
				var u = 2*Math.sqrt(-p/3);
				var t = Math.acos(3*q/p/u)/3;  // D < 0 implies p < 0 and acos argument in [-1..1]
				var k = 2*Math.PI/3;
				roots = [u*Math.cos(t), u*Math.cos(t-k), u*Math.cos(t-2*k)];
			}
		}

		// Convert back from depressed cubic
		for (var i = 0; i < roots.length; i++)
			roots[i] -= b/(3*a);

		return roots;
	}

	String.prototype.toHHMMSS = function () {
		var sec_num = parseInt(this, 10); // don't forget the second param
		var hours   = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);

		if (hours   < 10) {hours   = "0"+hours;}
		if (minutes < 10) {minutes = "0"+minutes;}
		if (seconds < 10) {seconds = "0"+seconds;}
		return hours+':'+minutes+':'+seconds;
	};

	function Rider (options) {
		this.options = options;

		if (this.options.powerCurve == undefined) {
			this.options.powerCurve = [-3.999958, 1.000008, 177029800, 2950797];
		}

		this.effort = this.options.effort ? this.options.effort : 1;

		this.reset();
	}

	Rider.prototype = {
		reset: function () {
			this.distance = 0;
			this.finished = false;
			this.time = 0;
			this.currentPower = 0;
			this.totalPowerSpent = 0;

			this.maxfuel = this.fueltank = 132000;  // TODO: starting watt-hours

			this.groupLeader = undefined;
		},

		getDistance: function () {
			return this.distance;
		},

		getTime: function () {
			return this.time;
		},

		getTimeInSeconds: function () {
			return this.time * 10;
		},

		getTimeAsString: function () {
			return String(this.getTimeInSeconds()).toHHMMSS();
		},

		isFinished: function () {
			return this.finished;
		},

		setFinished: function (finished) {
			this.finished = finished;
		},

		isInGroup: function () {
			return (this.groupLeader != undefined && this.groupLeader != this);
		},

		powerStep: function (power, gradient, distanceToFinish) {
			this.accelerateTo(power);

			var interval = this.updateDistance(gradient, distanceToFinish);

			this.updateFuel();

			this.totalPowerSpent += this.currentPower;

			this.time += interval;
		},

		step: function (gradient, distanceToFinish) {
			var desiredPower = this.options.maxPower * this.effort;

			this.powerStep(desiredPower, gradient, distanceToFinish);
		},

		stepWithLeader: function (gradient) {
			if (!this.groupLeader) {
				this.step(gradient);
				return;
			}

			var dist = this.groupLeader.getDistance();

			var powerNeeded = this.getPowerNeededToReach(dist);

			this.powerStep(powerNeeded, gradient);
		},

		getPowerNeededToReach: function (dist) {
			// TODO: this needs to be thought-out better
			var powerNeeded = (dist - this.getDistance()) / .004;
			return powerNeeded;
		},

		accelerateTo: function (desired) {
			if (this.currentPower <= desired) {
				var attemptedPower = Math.min(this.currentPower + this.options.acceleration, desired);

				this.currentPower = Math.min(Math.max(0, this.fueltank), attemptedPower);

				// THEORY: the less fuel you have, the slower you go (with exponential out easing)
				//var fatigue = d3.easeExpOut(this.getFuelPercent());
				//this.currentPower *= fatigue;

			} else if (this.currentPower > desired) {
				// TODO: decelerating is immediate?
				this.currentPower = desired;
			}
		},

		getDistanceFromPower: function (power, gradient) {
			var angle = 0;

			if (gradient != 0)
				angle = Math.atan(gradient);

			// P = Kr M s + Ka A s v^2 d + g i M s
			// from http://theclimbingcyclist.com/gradients-and-cycling-how-much-harder-are-steeper-climbs/

			var rolling_resistance = .008;     // Wooden Track 0.001, Smooth Concrete	0.002, Asphalt Road	0.004, Rough but Paved Road	0.008
			var wind_resistance = .25;          // no head- or tailwind
			var frontal_area = .4;             // aero, 0.4 to 0.7 is typical
			var air_density = 1.0;           // sea level 1.226, 1500 Meters	1.056, 3000 Meters 0.905
			var gravity = 9.8;

			var c1 = (rolling_resistance * this.options.weight);
			var a = (wind_resistance * frontal_area * air_density);
			var c2 = (gravity * gradient * this.options.weight);

			// P = a * s + b * s^3 + c * s

			var roots = solveCubic(a, 0, c1 + c2, -power);

			var rise = Math.sin(angle), run = Math.cos(angle);
			var dist = roots[0] / 10;

			var fast = dist * run * this.options.flatAbility;
			var slow = dist * rise * this.options.climbingAbility;

			return fast + slow;
		},

		updateDistance: function (gradient, distanceToFinish) {
			var timeInterval = 1;

			if (this.isInGroup()) {
				// TODO: this shouldn't be automatic
				this.distance = this.groupLeader.getDistance();
			} else {
				// distance takes gradient, muscle fibers, weight into account
				var distanceCovered = this.getDistanceFromPower(this.currentPower, gradient);

				if (distanceCovered > distanceToFinish) {
					this.distance += distanceToFinish;
					timeInterval = distanceToFinish / distanceCovered;
				} else
					this.distance += distanceCovered;
			}

			return timeInterval;
		},

		getMultiplierForPower: function (power) {
			//return Math.max(1, 2950797 + (-3.999958 - 2950797)/(1 + Math.pow(power / 177029800, 1.000008)));

			var a = this.options.powerCurve[0], b = this.options.powerCurve[1], c = this.options.powerCurve[2], d = this.options.powerCurve[3];

			return Math.max(1, d + (a - d) / (1 + Math.pow(power / c, b)));
		},

		updateFuel: function () {
			var multiplier = this.getMultiplierForPower(this.currentPower);

			var powerDelta = Math.max(0, this.currentPower) * multiplier;

			this.fueltank = Math.max(0, this.fueltank - powerDelta);

			this.fueltank += this.options.recovery;
		},

		getMaxPower: function () {
			return this.options.maxPower;
		},

		getAcceleration: function () {
			return this.options.acceleration;
		},

		getRecovery: function () {
			return this.options.recovery;
		},

		getEffort: function () {
			return this.effort;
		},

		getPower: function () {
			return this.currentPower;
		},

		getFuelPercent: function () {
			return this.fueltank / this.maxfuel;
		},

		deltaEffort: function (delta) {
			this.effort += delta;
			this.currentPower = this.options.maxPower * this.effort;
		},

		setEffort: function (val) {
			if (val instanceof Object) {
				if (val.power)
					this.effort = val.power / this.options.maxPower;
			} else {
				this.effort = val;
			}

			if (this.effort <= 0) this.effort = .01;
		},

		setGroupLeader: function (rider) {
			this.groupLeader = rider;
		},

		leaveGroup: function () {
			this.setGroupLeader(undefined);
		},

		getAverageSpeed: function () {
			var avg = this.distance / 10 / this.time * 360;

			return avg;
		},

		getAveragePower: function () {
			return this.totalPowerSpent / this.time;
		},

		setPowerCurve: function () {
			for (var i = 0; i < arguments.length; i++) {
				this.options.powerCurve[i] = arguments[i];
			}
		},

		getPowerCurve: function () {
			return this.options.powerCurve;
		}
	};

	return Rider;
});
