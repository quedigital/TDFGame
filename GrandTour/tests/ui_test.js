requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "../libs/jquery-2.1.3.min",
		"underscore": "../libs/underscore-min",
		"d3": "../libs/d3.min",
		"easeljs": "../libs/easeljs-0.8.2.min",
		"preloadjs": "../libs/preloadjs-0.6.2.min",
		"interact": "../libs/interact.min",
		"raphael": "../libs/raphael.min"
	},
	shim: {
		"jquery": {
			exports: "$"
		},
		"easeljs": {
			exports: "createjs"
		},
		"preloadjs": {
			exports: "createjs"
		}
	}
});

var RaceManager, Rider, Map, Team;

// 2s, 5s, 60s, 5min, 20min, 45min, 3hrs
// default powercurve = [1600, 1440, 690, 456, 384, 320, 300]

var TopView;
var RiderController, RaceInterface;

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
	requirejs(["racemanager", "rider", "map", "jquery", "top-view", "rider-controller", "race-interface", "team"], function (RaceManager_class, Rider_class, Map_class, $, TopView_class, RiderController_class, RaceInterface_class, Team_class) {
		RaceManager = RaceManager_class;
		Rider = Rider_class;
		Map = Map_class;
		TopView = TopView_class;
		RiderController = RiderController_class;
		RaceInterface = RaceInterface_class;
		Team = Team_class;

		done();
	});
});

describe("UI Test", function () {
	this.timeout(60000);

	describe("Power control", function () {
		before(function () {
			var rm = new RaceManager({interval: 1, delay: 100});
			var flat_course = new Map({gradients: [[0, 0], [15.0, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			this.roster1 = {};

			makeBasicRiders(this);
			makeBasicRiders(this.roster1);

			rm.addRider(this.tt);
			rm.addRider(this.sprinter);
			rm.addRider(this.climber);

			this.team1 = new Team({
				name: "Thirsty-Kombucha",
				riders: [this.roster1.tt, this.roster1.sprinter, this.roster1.climber]
			});

			rm.addTeam(this.team1);

			//rm.escapeRider(this.sprinter);

			//this.tt.setEffort({ power: 200 });
			//this.sprinter.setEffort({ power: 320 });
			rm.getPeloton().setEffort({power: 300});

			this.rm = rm;

			this.ri = new RaceInterface({
				raceManager: this.rm,
				team: this.team1
			});
		});

		it("Can control rider with power control", function (done) {
			this.rm.runToFinish({callback: done});
		});
	});
});