var assert = require('assert');
var requirejs = require('requirejs');
var underscore = require('underscore');

describe("Riders", function() {
	var RaceManager;
	var Map;
	var Rider;

	requirejs.config({
		baseUrl: "js",
		nodeRequire: require,
		paths: {
			"jquery": "../libs/jquery-2.1.3.min"
		}
	});

	before(function (done) {
		requirejs(["racemanager", "rider", "map"], function (RaceManager_class, Rider_class, Map_class) {
			RaceManager = RaceManager_class;
			Map = Map_class;
			Rider = Rider_class;

			done();
		});
	});

	describe("Rider Types", function () {
		var rm;
		var tt, sprinter;

		beforeEach(function (done) {
			rm = new RaceManager();

			tt = new Rider( { name: "Time-trialer", maxPower: 600, acceleration: 50, recovery: 100, weight: 68, weight_to_power: 6.5, fastTwitch:.8, slowTwitch:.2, effort: 1 } );
			sprinter = new Rider( { name: "Sprinter", maxPower: 600, acceleration: 300, recovery: 80, weight: 75, weight_to_power: 5.0, fastTwitch:.7, slowTwitch:.3, effort: 1 } );

			rm.addRider(tt);
			rm.addRider(sprinter);

			done();
		});

		it('should return -1 when the value is not present', function () {
			assert.equal(-1, [1,2,3].indexOf(4));
		});

		it("TT beats Sprinter in flat 15 km stage", function () {
			var flat_course = new Map( { gradients: [ [0, 0], [150, 0] ] } );

			rm.setMap(flat_course);

			rm.runToFinish();

			assert.equal(flat_course.getTotalDistance(), 150);

			assert.ok(sprinter.getTime() > tt.getTime(), "sprinter time greater than time-trialer time");
		});
	});
});