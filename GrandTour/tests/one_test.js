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
// 2s, 5s, 60s, 5min, 20min, 45min, 3hrs
// default powercurve = [1600, 1440, 690, 456, 384, 320, 300]

function makeBasicRiders (obj) {
	var tt = new Rider({
		name: "Time-trialer",
		maxPower: 1200,
		powerCurve: [1200, 1000, 630, 535, 460, 400, 330],
		acceleration: 40,
		weight: 70,
		flatAbility: .88,
		climbingAbility: .2,
		descendingAbility:.5
	});

	var sprinter = new Rider({
		name: "Sprinter",
		maxPower: 1650,
		powerCurve: [1600, 1440, 690, 456, 384, 320, 320],
		acceleration: 800,
		weight: 90,
		flatAbility: .78,
		climbingAbility: .1,
		descendingAbility:.7
	});

	var climber = new Rider({
		name: "Climber",
		maxPower: 1100,
		powerCurve: [1100, 900, 555, 455, 415, 390, 330],
		acceleration: 30,
		weight: 60,
		flatAbility: .72,
		climbingAbility: 1.6,
		descendingAbility:.6
	});

	obj.tt = tt;
	obj.sprinter = sprinter;
	obj.climber = climber;
}

before(function (done) {
	requirejs(["racemanager", "rider", "map", "jquery"], function (RaceManager_class, Rider_class, Map_class) {
		RaceManager = RaceManager_class;
		Rider = Rider_class;
		Map = Map_class;

		done();
	});
});

describe("Grand Tour", function () {
	describe("Flat Stage", function () {
		var flat_course, tt, sprinter;

		before(function () {
			this.rm = new RaceManager({interval: 1, delay: 100});

			flat_course = new Map({gradients: [[0, 0], [15, 0]]});

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);
			this.tt_full = new_riders.tt;

			this.rm.setMap(flat_course);

			this.tt.setEffort({ power: 470 });
			this.sprinter.setEffort({ power: 390 });
			this.tt_full.setEffort(1);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.tt_full);

			this.rm.runToFinish();
		});

		it("Flat course is 15km", function () {
			flat_course.getTotalDistance().should.equal(15);
		});

		it("TT average speed is about 56 km/h", function () {
			this.tt.getAverageSpeed().should.be.within(55, 57);
		});

		it("Sprinter is about 2 minutes slower than TT over 15 km flat stage", function () {
			(this.sprinter.getTimeInSeconds() - this.tt.getTimeInSeconds()).should.be.within(1.5 * 60, 2.5 * 60);
		});

		it("Going full out is less effective than a steady rate", function () {
			this.tt_full.getTimeInSeconds().should.be.above(this.tt.getTimeInSeconds());
		});

		it("TT Energy at the end should be about zero", function () {
			this.tt.getFuelPercent().should.be.below(10);
		});
	});
});