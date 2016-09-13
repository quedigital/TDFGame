define(["d3"], function (d3) {
	var LOOKUP_STARTING_POWER = 10;

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

	/* Monotone cubic spline interpolation
	 Usage example:
	 var f = createInterpolant([0, 1, 2, 3, 4], [0, 1, 4, 9, 16]);
	 var message = '';
	 for (var x = 0; x <= 4; x += 0.5) {
	 var xSquared = f(x);
	 message += x + ' squared is about ' + xSquared + '\n';
	 }
	 alert(message);
	 */
	var createInterpolant = function(xs, ys) {
		var i, length = xs.length;

		// Deal with length issues
		if (length != ys.length) { throw 'Need an equal count of xs and ys.'; }
		if (length === 0) { return function(x) { return 0; }; }
		if (length === 1) {
			// Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
			// Impl: Unary plus properly converts values to numbers
			var result = +ys[0];
			return function(x) { return result; };
		}

		// Rearrange xs and ys so that xs is sorted
		var indexes = [];
		for (i = 0; i < length; i++) { indexes.push(i); }
		indexes.sort(function(a, b) { return xs[a] < xs[b] ? -1 : 1; });
		var oldXs = xs, oldYs = ys;
		// Impl: Creating new arrays also prevents problems if the input arrays are mutated later
		xs = []; ys = [];
		// Impl: Unary plus properly converts values to numbers
		for (i = 0; i < length; i++) { xs.push(+oldXs[indexes[i]]); ys.push(+oldYs[indexes[i]]); }

		// Get consecutive differences and slopes
		var dys = [], dxs = [], ms = [];
		for (i = 0; i < length - 1; i++) {
			var dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
			dxs.push(dx); dys.push(dy); ms.push(dy/dx);
		}

		// Get degree-1 coefficients
		var c1s = [ms[0]];
		for (i = 0; i < dxs.length - 1; i++) {
			var m = ms[i], mNext = ms[i + 1];
			if (m*mNext <= 0) {
				c1s.push(0);
			} else {
				var dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
				c1s.push(3*common/((common + dxNext)/m + (common + dx_)/mNext));
			}
		}
		c1s.push(ms[ms.length - 1]);

		// Get degree-2 and degree-3 coefficients
		var c2s = [], c3s = [];
		for (i = 0; i < c1s.length - 1; i++) {
			var c1 = c1s[i], m_ = ms[i], invDx = 1/dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_;
			c2s.push((m_ - c1 - common_)*invDx); c3s.push(common_*invDx*invDx);
		}

		// Return interpolant function
		return function(x) {
			// The rightmost point in the dataset should give an exact result
			var i = xs.length - 1;
			if (x == xs[i]) { return ys[i]; }

			// Search for the interval x is in, returning the corresponding y if x is one of the original xs
			var low = 0, mid, high = c3s.length - 1;
			while (low <= high) {
				mid = Math.floor(0.5*(low + high));
				var xHere = xs[mid];
				if (xHere < x) { low = mid + 1; }
				else if (xHere > x) { high = mid - 1; }
				else { return ys[mid]; }
			}
			i = Math.max(0, high);

			// Interpolate
			var diff = x - xs[i], diffSq = diff*diff;
			var inter;
			// CB: handle cases with Infinity
			if (isFinite(c1s[i]))
				inter = ys[i] + c1s[i]*diff + c2s[i]*diffSq + c3s[i]*diff*diffSq;
			else
				inter = ys[i];
			return inter;
		};
	};

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

	function getClimbingFactor (gradient) {
		var g = Math.abs(gradient) / 3.0;
		return d3.easeExpOut(g);
	}

	function getDescendingFactor (gradient) {
		var g = Math.abs(gradient) / 2.0;
		return d3.easeExpOut(g);
	}

	var POWER_INTERVALS = [2, 5, 60, 300, 1200, 2700, 10800];

	function Rider (options) {
		this.options = options;

		if (this.options.powerCurve == undefined) {
			// 2s, 5s, 60s, 5min, 20min, 45min, 3hrs
			// max avg watts over 2s, 5s, etc.
			this.setPowerCurve(1600, 1440, 690, 456, 384, 320, 300);    // Greipel
		} else {
			this.setPowerCurve(this.options.powerCurve);
		}

		if (this.options.redzonePenalty == undefined) {
			this.options.redzonePenalty = true;
		}

		this.effort = this.options.effort ? this.options.effort : 1;

		this.reset();
	}

	Rider.DRAFT_PERCENT = .8;

	Rider.prototype = {
		reset: function () {
			this.distance = 0;
			this.finished = false;
			this.time = 0;
			this.currentPower = 0;
			this.currentSpeed = 0;
			this.totalPowerSpent = 0;
			this.redzone_count = 0;
			this.cooperating = true;
			this.orderInGroup = 0;

			this.distanceTrack = [];

			this.setStartingFuelValues();

			this.setupPowerFactors();

			this.options.recovery = this.options.powerCurve[this.options.powerCurve.length - 1];

			this.group = undefined;

			this.stats = { pulls: 0 };

			this.powerLookup = {};

			this.createPowerLookup();
		},

		setupPowerFactors: function () {
			var xs = [], ys = [];

			for (var i = 0; i < POWER_INTERVALS.length; i++) {
				var duration = POWER_INTERVALS[i];
				var watts = this.options.powerCurve[i];
				xs.push(watts);
				ys.push(duration);
			}

			this.getInterpolant = createInterpolant(xs, ys);
		},

		getDistance: function () {
			return this.distance;
		},

		getTime: function () {
			return this.time;
		},

		getTimeInSeconds: function () {
			return this.time;
		},

		getTimeAsString: function () {
			return String(this.getTimeInSeconds()).toHHMMSS();
		},

		// in km/s
		getCurrentSpeed: function () {
			return this.currentSpeed;
		},

		// in km/h
		getCurrentSpeedInKMH: function () {
			return this.currentSpeed * 60 * 60;
		},

		isFinished: function () {
			return this.finished;
		},

		setFinished: function (finished) {
			this.finished = finished;
		},

		isInGroup: function () {
			return this.group != undefined;
		},

		getGroup: function () {
			return this.group;
		},

		isGroupLeader: function () {
			return this.group && this.group.getGroupLeader() == this;
		},

		// step 1 second
		step: function (gradient, distanceToFinish) {
			if (this.options.name == "TT Solo") {
				var a = 5;
			}

			var lastDistance = this.distance;
			var lastTime = this.time;

			var desiredPower = this.getMaxPower() * this.effort;

			this.accelerateTo(desiredPower);

			var distanceCovered = this.getDistanceFromPower(this.currentPower, gradient);

			// TODO: average from last time interval for better smoothing?
			//var actual_speed = (distanceCovered + this.currentSpeed) * .5;

			var actual_speed = distanceCovered;

			var timeInterval = 1.0;

			if (actual_speed > distanceToFinish) {
				this.distance += distanceToFinish;
				timeInterval = distanceToFinish / actual_speed;
			} else
				this.distance += actual_speed;

			this.currentSpeed = actual_speed;
			this.currentGradient = gradient;

			this.updateFuel();

			this.totalPowerSpent += this.currentPower;

			this.time += timeInterval;

			this.overrideDistance(this.distance);
		},

		overrideDistance: function (distance) {
			this.distance = distance;

			var entry = Math.floor(this.distance);
			if (this.distanceTrack[entry] == undefined) {
				this.distanceTrack[entry] = this.time;
			}
		},

		getTimeAt: function (distance) {
			return this.distanceTrack[Math.floor(distance)];
		},

		accelerateTo: function (desired) {
			if (this.currentPower <= desired) {
				var attemptedPower = Math.min(this.currentPower + this.options.acceleration, desired);
				// turn off acceleration for testing
				//attemptedPower = desired;

				if (this.fueltank > 0) {
					this.currentPower = Math.min(this.fueltank, attemptedPower);
				} else {
					// THEORY: when tank is empty, you go 95% of your recovery rate? And it gets worse?
					this.currentPower = this.getRestingPower() * .95;
				}
			} else if (this.currentPower > desired) {
				// decelerating is immediate?
				this.currentPower = desired;
			}
		},

		getDistanceFromPower: function (power, gradient) {
			// drafting uses less power but goes just as far (ie, use non-reduced power levels for distance calculations)
			if (this.isInGroup() && !this.isGroupLeader()) {
				power *= (1.0 / Rider.DRAFT_PERCENT);
			}

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

			var dist = roots[0] / 1000;

			var flat = 0, climb = 0, descend = 0;

			if (gradient > 0) {
				var rise = getClimbingFactor(gradient);
				var run = 1.0 - rise;
				climb = dist * rise * (.1 + .9 * this.options.climbingAbility);
				flat = dist * run * (.5 + .5 * this.options.flatAbility);
			} else if (gradient < 0) {
				// descending doesn't get quite the same gradient advantage as climbing, to keep speeds down
				var descentFactor = getDescendingFactor(gradient);
				var run = 1.0 - descentFactor;
				descend = dist * descentFactor * (.2 + .8 * this.options.descendingAbility);
				flat = dist * run * (.5 + .5 * this.options.flatAbility);
			} else {
				flat = dist * (.5 + .5 * this.options.flatAbility);
			}

			var total = flat + climb + descend;
			return total;
		},

		setStartingFuelValues: function () {
			// lowest power over longest duration = starting fuel

			var n = POWER_INTERVALS.length - 1;

			this.maxfuel = this.fueltank = this.options.powerCurve[n] * POWER_INTERVALS[n];
		},

		getDurationForPower: function (power) {
			// outside of ranges
			if (power > this.options.powerCurve[0]) {
				return 1;
			} else if (power < this.options.powerCurve[this.options.powerCurve.length - 1]) {
				return POWER_INTERVALS[POWER_INTERVALS.length - 1];
			}

			var duration = this.getInterpolant(power);
			if (duration < 0) duration = 1;

			//console.log(power + " => " + duration);

			return duration;
		},

		getMultiplierForPower: function (power) {
			if (power == 0)
				return 0;

			var duration = this.getDurationForPower(power);
			var recovery = this.options.recovery * duration;

			var m = (this.maxfuel + recovery) / (duration * power);

			if (m < 0) m = 0;

			return m;
		},

		updateFuel: function () {
			var multiplier = this.getMultiplierForPower(this.currentPower);

			var powerWithDraft = this.currentPower;
			if (this.isInGroup() && !this.isGroupLeader()) {
				powerWithDraft *= Rider.DRAFT_PERCENT;
			}

			var powerScaled = Math.max(0, powerWithDraft) * multiplier;

			this.fueltank -= powerScaled;

			// slower recovery after going negative

			this.fueltank += this.options.recovery;

			/*
			if (this.fueltank >= 0 || !this.options.redzonePenalty) {
				this.fueltank += this.options.recovery;
			} else {
				var recovery_amount = this.options.recovery;
				var redzone_factor = 1.223022*Math.pow(-this.fueltank, -0.1667914);
				this.fueltank += recovery_amount * redzone_factor;
				this.redzone_count++;
			}
			*/

			this.fueltank = Math.min(this.fueltank, this.maxfuel);
		},

		getMaxPower: function () {
			return this.options.powerCurve[0];
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
			return (this.fueltank / this.maxfuel) * 100;
		},

		deltaEffort: function (delta) {
			this.effort += delta;
			this.currentPower = this.getMaxPower() * this.effort;
		},

		setEffort: function (val) {
			if (val instanceof Object) {
				if (val.power != undefined) {
					this.effort = val.power / this.getMaxPower();
				}
			} else {
				this.effort = val;
			}

			if (this.effort <= 0) this.effort = .01;
		},

		setGroup: function (group) {
			this.group = group;
		},

		getAverageSpeed: function () {
			var avg = this.distance / (this.time / 3600);

			return avg;
		},

		getAveragePower: function () {
			return this.totalPowerSpent / this.time;
		},

		getAverageSpeedBetween: function (distance1, distance2) {
			var d1 = Math.floor(distance1);
			var d2 = Math.floor(distance2);

			var t1 = this.distanceTrack[d1];
			var t2 = this.distanceTrack[d2];

			var distance = d2 - d1;
			var time = t2 - t1;

			return distance / time * 3600;
		},

		setPowerCurve: function () {
			var first = arguments[0];
			var args = Array.prototype.slice.call(arguments);

			if (typeof(first) == "number") {
				this.options.powerCurve = args.slice();
			} else if (Array.isArray(first)) {
				this.options.powerCurve = args[0].slice();
			} else if (arguments instanceof Object) {
				var ar = [];
				ar.push(args[0]["2s"]);
				ar.push(args[0]["5s"]);
				ar.push(args[0]["60s"]);
				ar.push(args[0]["5min"]);
				ar.push(args[0]["20min"]);
				ar.push(args[0]["45min"]);
				ar.push(args[0]["3hrs"]);
				this.options.powerCurve = ar.slice();
			}

			this.setupPowerFactors();
		},

		getPowerCurve: function () {
			return this.options.powerCurve;
		},

		getRestingPower: function () {
			return this.options.powerCurve[this.options.powerCurve.length - 1];
		},

		refuel: function (opts) {
			if (opts.percent) {
				this.fueltank = this.maxfuel * (opts.percent / 100);
			} else if (opts.value) {
				this.fueltank = opts.value * this.getMultiplierForPower(opts.value) * 17 * 60;
			}
		},

		getRedzoneCount: function () {
			return this.redzone_count;
		},

		resetRedzoneCount: function () {
			this.redzone_count = 0;
		},

		showStats: function () {
			var s = this.options.name + ": " + this.getTimeAsString() + " @ " + Math.round(this.getDistance() * 1000) / 1000 + "km " + Math.round(this.getFuelPercent()) + "% (" + Math.round(this.getAverageSpeed()) + "kmh, " + Math.round(this.getAveragePower()) + " watts)";
			console.log(s);

			// tracks: pulls at front
			//console.log(this.stats);
		},

		getCurrentPower: function () {
			return this.currentPower;
		},

		getDesiredPower: function () {
			return this.options.getMaxPower() * this.effort;
		},

		setCooperating: function (coop) {
			this.cooperating = coop;
		},

		isCooperating: function () {
			return this.cooperating;
		},

		createPowerLookup: function () {
			// gradient is multiplied by 100 (ie, .12 => 12)
			for (var g = -12; g <= 12; g += 1) {
				var array = [];

				for (var power = LOOKUP_STARTING_POWER; power <= this.getMaxPower(); power += 10) {
					var gradient = g / 100;
					var distance = this.getDistanceFromPower(power, gradient);
					array.push(distance);
				}

				this.powerLookup[g] = array;
			}
		},

		lookupPowerForDistance: function (distance, gradient) {
			// round gradient to nearest tenth
			var g = Math.round(gradient * 100);

			var chart = this.powerLookup[g];

			if (chart == undefined) {
				debugger;
				console.log("No lookup found for gradient " + gradient);
			}

			for (var i = 1; i < chart.length; i++) {
				var d = chart[i];
				// TODO: find the closest power
				if (d > distance) {
					var d0 = chart[i - 1];
					var diff_high = d - distance;
					var diff_low = distance - chart[i - 1];
					if (diff_high > diff_low) {
						return LOOKUP_STARTING_POWER + ((i - 1) * 10);
					} else {
						return LOOKUP_STARTING_POWER + (i * 10);
					}
				} else if (d == distance) {
					return LOOKUP_STARTING_POWER + i * 10;
				}
			}

			// off the charts power requirement, give 'em max power

			return this.getMaxPower();
		},

		lookupDistanceFromPower: function (power, gradient) {
			// round gradient to nearest tenth
			var g = Math.round(gradient * 100);

			var chart = this.powerLookup[g];

			if (chart == undefined) {
				//debugger;
				//console.log("No lookup found for gradient " + gradient);
				return undefined;
			}

			var entry = Math.round((power - LOOKUP_STARTING_POWER) / 10);

			return chart[entry];
		},

		graphPowerCurve: function (dom, options) {
			var MIN_WATTS = 300;
			var WIDTH = 1200, HEIGHT = 800;

			if (options == undefined) {
				options = { labels: true, dots: true, color: "yellow" };
			}

			var c = dom.find("canvas");
			if (!c.length) {
				c = $("<canvas width='" + WIDTH + "' height='" + HEIGHT+ "'>");
				dom.append(c);
			}

			var ctx = c[0].getContext("2d");

			ctx.strokeStyle = options.color;
			ctx.lineWidth = 5;

			var max_d, min_d;

			var xs = [], ys = [];

			for (var i = 0; i < POWER_INTERVALS.length; i++) {
				var duration = POWER_INTERVALS[i];
				var watts = this.options.powerCurve[i];
				xs.push(watts);
				ys.push(duration);
			}

			var func = createInterpolant(xs, ys);

			for (var watts = MIN_WATTS; watts <= this.getMaxPower(); watts += 100) {
				var duration = func(watts);
				var d = Math.log(duration);
				if (d > max_d || max_d == undefined) max_d = d;
				if (d < min_d || min_d == undefined) min_d = d;
				//console.log(watts + " => " + duration);
			}

			var range_x = this.getMaxPower() - MIN_WATTS;
			var dx = range_x / WIDTH;
			var range_y = max_d - min_d;
			var dy = range_y / HEIGHT;

			ctx.beginPath();

			for (var watts = MIN_WATTS; watts <= this.getMaxPower(); watts += 1) {
				var duration = func(watts);
				var d = Math.log(duration);

				var x = (watts - MIN_WATTS) / dx;
				var y = HEIGHT - (d - min_d) / dy;

				if (watts == MIN_WATTS)
					ctx.moveTo(x, y);
				else
					ctx.lineTo(x, y);
			}

			ctx.stroke();

			ctx.beginPath();

			for (var i = 0; i < POWER_INTERVALS.length; i++) {
				var duration = POWER_INTERVALS[i];
				var watts = this.options.powerCurve[i];
				var d = Math.log(duration);

				var x = (watts - MIN_WATTS) / dx;
				var y = HEIGHT - (d - min_d) / dy;

				if (options.dots) {
					ctx.fillStyle = "green";

					ctx.arc(x, y, 10, 0, Math.PI * 2, false);
					ctx.fill();
					ctx.closePath();
				}

				if (options.labels) {
					ctx.fillStyle = "black";

					var txt = duration + "s @ " + watts + "W";
					ctx.font = "bold 10px Arial";
					var w = ctx.measureText(txt).width;
					if (i == 0) {
						ctx.fillText(txt, x - w, y - 20);
					} else if (i == POWER_INTERVALS.length - 1) {
						ctx.fillText(txt, x, y + 20);
					} else {
						ctx.fillText(txt, x - w * .5, y + 20);
					}
				}
			}
		}
	};

	return Rider;
});
