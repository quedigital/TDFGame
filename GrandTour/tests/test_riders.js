requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "../libs/jquery-2.1.3.min",
		"underscore": "../libs/underscore-min",
		"d3": "../libs/d3.min"
	},
	shim: {
		"jquery": {
			exports: "$"
		}
	}
});

var RaceManager, Rider, Map;

describe("Riders", function () {
	before(function (done) {
		requirejs(["racemanager", "rider", "map", "jquery"], function (RaceManager_class, Rider_class, Map_class) {
			RaceManager = RaceManager_class;
			Rider = Rider_class;
			Map = Map_class;

			done();
		});
	});

	describe("Rider Types", function () {
		var rm;
		var tt, sprinter;

		beforeEach(function (done) {
			rm = new RaceManager();

			tt = new Rider({
				name: "Time-trialer",
				basePower: 305,
				acceleration: 50,
				recovery: 0,
				weight: 70,
				fastTwitch: .8,
				slowTwitch: .2,
				effort: 1
			});
			sprinter = new Rider({
				name: "Sprinter",
				basePower: 305,
				acceleration: 600,
				recovery: 120,
				weight: 90,
				fastTwitch: .7,
				slowTwitch: .3,
				effort: 1
			});

			rm.addRider(tt);
			rm.addRider(sprinter);

			done();
		});

		/*
		it('should return -1 when the value is not present', function () {
			should.equal(-1, [1, 2, 3].indexOf(4));
		});
		*/

		it("TT beats Sprinter in flat 15 km stage", function () {
			var flat_course = new Map({gradients: [[0, 0], [150, 0]]});

			rm.setMap(flat_course);

			rm.runToFinish();

			should.equal(flat_course.getTotalDistance(), 150);

			tt.getAverageSpeed().should.be.within(50, 65, "tt average speed around 55 km/h");

			should.ok(sprinter.getTime() > tt.getTime(), "sprinter time greater than time-trialer time");
		});

		it("Sprinter beats TT in final 800m", function () {
			var flat_course = new Map({gradients: [[0, 0], [150, 0]]});

			rm.setMap(flat_course);

			tt.setEffort(.5);
			sprinter.setEffort(.5);
			rm.makeGroup([tt, sprinter]);
			rm.runToMeters(-800);

			tt.setEffort(1);
			sprinter.setEffort(1);
			sprinter.leaveGroup();
			rm.runToFinish();

			should.ok(sprinter.getTime() < tt.getTime(), "sprinter time less than time-trialer time");
		});

		it("Gradient takes longer to ride than flat course", function () {
			var flat_course = new Map({gradients: [[0, 0], [80, 0]]});             // 8 km flat
			var mtn_course = new Map( { gradients: [ [0, .12], [80, .12] ] } );    // 8 km @ 12%

			var mtn_rm = new RaceManager();
			var mtn_tt = $.extend({}, tt);
			mtn_rm.addRider(mtn_tt);

			rm.setMap(flat_course);
			mtn_rm.setMap(mtn_course);

			tt.setEffort(1);
			mtn_tt.setEffort(1);

			rm.runToFinish();
			mtn_rm.runToFinish();

			expect(tt.getTime()).below(mtn_tt.getTime());

			mtn_tt.getAverageSpeed().should.be.within(10, 15, "mtn tt average speed around 12 km/h");
		});

		/*
		it("Riders can get dropped from their groups", function () {

		});

		it("Downhill sections have difficulty ratings and hairpin-like sections", function () {

		});
		*/
	});
});