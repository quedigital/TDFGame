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

var TopView;

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

describe("Road Test", function () {
	it("Setup", function (done) {
		requirejs(["racemanager", "rider", "map", "jquery", "top-view"], function (RaceManager_class, Rider_class, Map_class, $, TopView_class) {
			RaceManager = RaceManager_class;
			Rider = Rider_class;
			Map = Map_class;
			TopView = TopView_class;

			done();
		});
	});

	describe("Top view", function () {
		before(function () {
			this.rm = new RaceManager();

			flat_course = new Map({gradients: [[0, 0], [15, 0]]});

			makeBasicRiders(this);

			this.rm.setMap(flat_course);
			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);

			var tv = new TopView($("#race-view"));

			this.rm.addView(tv);
		});

		it("Show race positions", function () {
			this.rm.runTo({km: 7.5});
		});
	});
});