define(["Formation"], function (Formation) {

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

	function Rider (props) {
		var defaults = {
			currentDistance: 0,
			health: 1.0
		};

		props = $.extend(defaults, props);

		this.name = props.name;
		this.number = props.number;

		this.currentDistance = props.currentDistance;
		this.currentSpeed = 0;
		this.currentGradient = 0;
		this.desiredDistanceChange = 0;
		this.currentLane = 0;
		this.fastTwitch = props.fastTwitch;
		this.slowTwitch = props.slowTwitch;
		this.currentPower = 0;
		this.desiredPower = 0;
		this.exertion = 0;
		this.health = props.health;

		// P = Kr M s + Ka A s v^2 d + g i M s
		// from http://theclimbingcyclist.com/gradients-and-cycling-how-much-harder-are-steeper-climbs/

		this.rolling_resistance = .005;     // Wooden Track 0.001, Smooth Concrete	0.002, Asphalt Road	0.004, Rough but Paved Road	0.008
		this.mass = 90;
		this.speed_on_road = 2.78;          // 10 km/h
		this.wind_resistance = .5;          // no head- or tailwind
		this.frontal_area = .6;             // aero, 0.4 to 0.7 is typical
		this.speed_through_air = 2.78;      // no wind (bike speed + headwind or – tailwind)
		this.air_density = 1.226;           // sea level 1.226, 1500 Meters	1.056, 3000 Meters 0.905
		this.gravity = 9.8;
		this.gradient = .05;
		this.bike_efficiency = .95;

		// watts
		this.calculatePower = function () {
			var power = (this.rolling_resistance * this.mass * this.speed_on_road)
				+ (this.wind_resistance * this.frontal_area * this.speed_on_road * (this.speed_through_air * this.speed_through_air) * this.air_density)
				+ (this.gravity * this.gradient * this.mass * this.speed_on_road);

			return power / this.bike_efficiency;
		};

		// meters per second
		this.calculateSpeed = function (power, gradient) {
			// assuming no wind
			var c1 = (this.rolling_resistance * this.mass);
			var a = (this.wind_resistance * this.frontal_area * this.air_density);
			var c2 = (this.gravity * gradient * this.mass);

			// P = a * s + b * s^3 + c * s

			var roots = solveCubic(a, 0, c1 + c2, -power);

			return roots[0];
		};

	}

	Rider.prototype.setExertionLevel = function (e) {
		this.exertion = e;
	};

	Rider.prototype.step = function (params) {
		this.determinePower(params.gradient);

		this.currentGradient = params.gradient;

		// TODO: this shouldn't be automatic
		this.currentPower = this.desiredPower;

		this.desiredSpeed = this.calculateSpeed(this.currentPower, params.gradient);

		this.desiredDistanceChange = this.desiredSpeed * params.timeslice;

		this.currentSpeed = this.desiredSpeed;
	};

	Rider.prototype.getPowerFromMuscles = function (gradient) {
		// THEORY: the steeper the gradient, the more power comes from slow twitch

		var FAST_SCALE = 15, SLOW_SCALE = 15;

		var contribFromSlowTwitch = .6;
		var contribFromFastTwitch = .3;

		var totalMusclePower = (this.fastTwitch * FAST_SCALE * contribFromFastTwitch)
			+ (this.slowTwitch * SLOW_SCALE * contribFromSlowTwitch);

		return totalMusclePower;
	};

	Rider.prototype.determinePower = function (gradient) {
		this.desiredPower = this.exertion * this.health * this.getPowerFromMuscles(gradient);
	};

	Rider.prototype.setDistance = function (distance) {
		this.currentDistance = distance;
	}

	return Rider;
});
