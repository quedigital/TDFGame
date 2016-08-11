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

function makeBasicRiders (obj) {
	var tt = new Rider({
		name: "Time-trialer",
		maxPower: 1300,
		acceleration: 50,
		recovery: 405,
		weight: 70,
		flatAbility: .8,
		climbingAbility: .2
	});

	var sprinter = new Rider({
		name: "Sprinter",
		maxPower: 1600,
		acceleration: 400,
		recovery: 385,
		weight: 90,
		flatAbility: .7,
		climbingAbility: .1
	});

	var climber = new Rider({
		name: "Climber",
		maxPower: 1300,
		acceleration: 30,
		recovery: 400,
		weight: 60,
		flatAbility: .4,
		climbingAbility: .6
	});

	obj.tt = tt;
	obj.sprinter = sprinter;
	obj.climber = climber;
}

describe("Grand Tour", function () {
	it("Setup", function (done) {
		requirejs(["racemanager", "rider", "map", "jquery"], function (RaceManager_class, Rider_class, Map_class) {
			RaceManager = RaceManager_class;
			Rider = Rider_class;
			Map = Map_class;

			done();
		});
	});

	describe("Flat Stage", function () {
		var flat_course, tt, sprinter;

		before(function () {
			this.rm = new RaceManager();

			flat_course = new Map({gradients: [[0, 0], [150, 0]]}); // 15 km, Rohan Dennis won a 13.8 km TT in 2015 with a time of 14:46, averaging about 500 watts.

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);
			this.tt_full = new_riders.tt;

			this.rm.setMap(flat_course);

			this.tt.setEffort({ power: 500 });
			this.sprinter.setEffort({ power: 500 });
			this.tt_full.setEffort(1);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.tt_full);

			this.rm.runToFinish();

			console.log(this.tt.getFuelPercent());
			console.log(this.tt_full.getFuelPercent());
		});

		it("Flat course is 15km", function () {
			flat_course.getTotalDistance().should.equal(150);
		});

		it("TT average speed is between 45 and 55 km/h", function () {
			this.tt.getAverageSpeed().should.be.within(45, 55);
		});

		it("Sprinter is 100-110 seconds slower than TT over 15 km flat stage", function () {
			(this.sprinter.getTimeInSeconds() - this.tt.getTimeInSeconds()).should.be.within(100, 110);
		});

		it("Going full out is less effective than a steady rate", function () {
			this.tt_full.getTimeInSeconds().should.be.above(this.tt.getTimeInSeconds());
		});

		it("TT Energy at the end should be about zero", function () {
			this.tt.getFuelPercent().should.be.within(0, 2);
		});
	});

	describe("Sprinting", function () {
		before(function () {
			var rm = new RaceManager();
			var flat_course = new Map({gradients: [[0, 0], [150, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			rm.addRider(this.sprinter);
			rm.addRider(this.tt);

			this.tt.setEffort( { power: 300 });
			this.sprinter.setEffort( { power: 300 });
			rm.makeGroup([this.tt, this.sprinter]);
			rm.runTo({ meters: -800 });

			this.rm = rm;
		});

		it("Sprinter and TT have saved enough energy for sprint", function () {
			(this.sprinter.getFuelPercent()).should.be.above(.5);
			(this.tt.getFuelPercent()).should.be.above(.5);
		});

		it("Sprinter beats TT in final 800m", function () {
			this.tt.setEffort(1);
			this.sprinter.setEffort(1);
			this.sprinter.leaveGroup();
			this.rm.runToFinish();

			this.sprinter.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});

		it("Sprinter beats TT by 10-15 seconds", function () {
			(this.tt.getTimeInSeconds() - this.sprinter.getTimeInSeconds()).should.be.within(10, 15);
		});
	});

	describe("Hill Climb", function () {
		before(function () {
			var rm = new RaceManager();
			var mtn_rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [80, 0]]});       // 8 km flat
			var mtn_course = new Map({gradients: [[0, .12], [80, .12]]});    // 8 km @ 12%

			makeBasicRiders(this);

			rm.addRider(this.tt);

			var new_riders = {};
			makeBasicRiders(new_riders);
			this.mtn_tt = new_riders.tt;

			this.mtn_tt.setEffort({ power: 480 });
			this.climber.setEffort({ power: 475 });

			mtn_rm.addRider(this.mtn_tt);
			mtn_rm.addRider(this.climber);

			rm.setMap(flat_course);
			mtn_rm.setMap(mtn_course);

			rm.runToFinish();
			mtn_rm.runToFinish();

			console.log(this.mtn_tt.getFuelPercent());
			console.log(this.climber.getFuelPercent());

			console.log(this.mtn_tt.getTimeAsString());
			console.log(this.climber.getTimeAsString());
		});

		it("Steep gradient takes 25 to 30 minutes longer to ride than flat course", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.tt.getTimeInSeconds()).to.be.within(60 * 25, 60 * 30);
		});

		it("Hill Climb TT average speed is around 12 km/h", function () {
			this.mtn_tt.getAverageSpeed().should.be.within(10, 15);
			console.log(this.climber.getFuelPercent());
		});

		it("Climber wins mountain stage by 3 or 4 minutes", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.climber.getTimeInSeconds()).to.be.within(3 * 60, 4 * 60);
		});

		it("Done", function () {
			console.log("=-----=");
		});
	});

	describe("Power Curves", function () {
		before(function () {
			var rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [300, 0]]}); // 30 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			this.custom_tt = new Rider({
				name: "Custom Time-trialer",
				maxPower: 1600,
				acceleration: 50,
				recovery: 305,
				weight: 70,
				flatAbility: .8,
				climbingAbility: .2
			});

			rm.addRider(this.tt);
			rm.addRider(this.custom_tt);

			this.custom_tt.setPowerCurve(.3444671, 3.500777, 863.0446, 27.94112);   // vs. [-3.999958, 1.000008, 177029800, 2950797]

			this.tt.setEffort( { power: 450 } );
			this.custom_tt.setEffort( { power: 450 } );

			rm.runToFinish();
		});

		it("Riders have different power curves, generating different power", function () {
			this.sprinter.getMultiplierForPower(1440).should.be.within(18, 22);
			this.sprinter.getMultiplierForPower(690).should.be.within(7, 8);
			this.sprinter.getMultiplierForPower(456).should.be.within(3, 4);
			this.sprinter.getMultiplierForPower(384).should.be.within(2, 3);
			this.sprinter.getMultiplierForPower(300).should.be.within(.9, 1.1);

			this.tt.getPowerCurve().should.not.eql(this.custom_tt.getPowerCurve());
			this.tt.getMultiplierForPower(450).should.be.above(this.custom_tt.getMultiplierForPower(450));
		});

		it("A Custom TT can sustain mid-range power longer than standard TT", function () {
			this.custom_tt.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
			this.custom_tt.getAveragePower().should.be.within(this.tt.getAveragePower() + 10, this.tt.getAveragePower() + 20);
		});
	});

	describe("Climbing Ability", function () {
		before(function () {
			var rm = new RaceManager();

			var mtn_course = new Map({gradients: [[0,.12], [80,.12]]}); // 8 km @ 12%

			rm.setMap(mtn_course);

			makeBasicRiders(this);

			this.lite_climber = new Rider({
				name: "Lite Climber",
				maxPower: 1200,
				acceleration: 50,
				recovery: 305,
				weight: 50, // vs. 60
				flatAbility: .7,
				climbingAbility: .6
			});

			this.poor_climber = new Rider({
				name: "Climber",
				maxPower: 1200,
				acceleration: 50,
				recovery: 305,
				weight: 60,
				flatAbility: .7,
				climbingAbility: .5 // vs. .6
			});

			rm.addRider(this.tt);
			rm.addRider(this.climber);
			rm.addRider(this.lite_climber);
			rm.addRider(this.poor_climber);

			rm.runToFinish();
		});

		it("Ultra-Light Climber is roughly 5 minutes faster than Standard Climber", function () {
			(this.climber.getTimeInSeconds() - this.lite_climber.getTimeInSeconds()).should.be.within(300, 400);
		});

		it("Poor Climber is 50 to 60 seconds slower than Standard Climber", function () {
			(this.poor_climber.getTimeInSeconds() - this.climber.getTimeInSeconds()).should.be.within(50, 60);
		});
	});

	describe("Downhill", function () {
		before(function () {
			var rm = new RaceManager();
			var rm2 = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [150, 0]]});         // 15 km flat
			var downhill_course = new Map({gradients: [[0,-.12], [150,-.12]]}); // 15 km @ -12%

			rm.setMap(flat_course);
			rm2.setMap(downhill_course);

			this.dh = {};

			makeBasicRiders(this);
			makeBasicRiders(this.dh);

			this.tt.setEffort(1);
			this.dh.tt.setEffort(0.01);

			rm.addRider(this.tt);
			rm2.addRider(this.dh.tt);

			rm.runToFinish();
			rm2.runToFinish();
		});

		it("Coasting downhill 15km is 8-12 minutes faster (80-90 km/h) than 15km flat", function () {
			(this.tt.getTimeInSeconds() - this.dh.tt.getTimeInSeconds()).should.be.within(8 * 60, 12 * 60);
			this.dh.tt.getAverageSpeed().should.be.within(75, 85);
		});

		it("Coasting downhill uses hardly any power", function () {
			this.tt.getAveragePower().should.be.within(300, 400);
			this.dh.tt.getAveragePower().should.be.within(1, 20);
		});
	});

	describe("Rolling Course", function () {
		before(function () {
			var rm = new RaceManager();

			var gradient = 0.08;

			var rolling_course = new Map({gradients: [
				[0, 0],
				[200, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[200, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[200, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[200, 0]
			]});         // 125 km with 3 hills

			rm.setMap(rolling_course);

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);

			this.tt_steady = new_riders.tt;
			this.tt_steady.setEffort({ power: 350 });

			rm.addRider(this.tt);
			rm.addRider(this.climber);
			rm.addRider(this.sprinter);
			rm.addRider(this.tt_steady);

			rm.runToFinish();

			this.rm = rm;
		});

		it("Course is 125 km", function () {
			this.rm.getStageDistance().should.be.equal(1250);
		});

		it("Finish order for rolling 8% course @ full effort: TT, Climber, Sprinter", function () {
			this.tt.getTimeInSeconds().should.be.below(this.climber.getTimeInSeconds());
			this.climber.getTimeInSeconds().should.be.below(this.sprinter.getTimeInSeconds());
		});

		it("Full effort should not be as effective as pacing effort", function () {
			this.tt_steady.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});
	});

	describe("Group Versus Breakaway", function () {
		before(function () {
			var rm = new RaceManager();

			var gradient = 0.08;

			var course = new Map({gradients: [
				[0, 0],
				[100, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[100, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[100, 0],
				[50, gradient],
				[50,0],
				[50, -gradient],
				[200, 0]
			]});         // 95 km with 3 hills and a finishing straight

			rm.setMap(course);

			makeBasicRiders(this);

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt2 = new_riders.tt;

			makeBasicRiders(new_riders);
			this.tt3 = new_riders.tt;

			makeBasicRiders(new_riders);
			this.tt4 = new_riders.tt;

			makeBasicRiders(new_riders);
			this.tt5 = new_riders.tt;

			rm.addRider(this.tt);
			rm.addRider(this.tt2);
			rm.addRider(this.tt3);
			rm.addRider(this.tt4);
			rm.addRider(this.tt5);

			this.tt.setEffort({ power: 400 });
			this.tt2.setEffort({ power: 300 });

			rm.makeGroup([this.tt2, this.tt3, this.tt4, this.tt5]);

			// TODO: group speeds up to catch breakaway rider

			rm.runToFinish();

			this.rm = rm;
		});

		it("Course is 95 km", function () {
			this.rm.getStageDistance().should.be.equal(950);
		});

		it("Group finishes with the same time", function () {
			expect(this.tt2.getTime()).to.equal(this.tt3.getTime()).and.equal(this.tt4.getTime()).and.equal(this.tt5.getTime());
		});

		it("Breakaway rider gets caught by group", function () {
			console.log(this.tt.getTimeAsString());
			console.log(this.tt2.getTimeAsString());
			console.log(this.tt3.getTimeAsString());
			console.log(this.tt4.getTimeAsString());
			console.log(this.tt5.getTimeAsString());
			console.log("****");
		});
	});

	describe("Long Flat Stage", function () {
		var flat_course, tt, sprinter;

		before(function () {
			console.log("start long flat stage");

			this.rm = new RaceManager();

			flat_course = new Map({gradients: [[0, 0], [1500, 0]]});    // 150 km

			makeBasicRiders(this);

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt_refuel = new_riders.tt;
			this.climber_nobonk = new_riders.climber;

			this.climber.setEffort({ power: 350 });
			this.climber_nobonk.setEffort({ power: 350 });

			this.rm.setMap(flat_course);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);
			this.rm.addRider(this.climber_nobonk);
			this.rm.addRider(this.tt_refuel);
		});

		it("Refueling even once finishes about 40 seconds faster", function () {
			this.rm.runTo({ percent: 50 });

			this.tt_refuel.getFuelPercent().should.be.within(0, 1);

			this.tt_refuel.refuel({ percent: 100 });

			this.tt_refuel.getFuelPercent().should.equal(1);

			this.climber.refuel({ value: 400 });
			this.climber_nobonk.refuel({ value: 400 });

			this.climber.setEffort(1);  // programmed to bonk
			this.climber.options.name = "Bonker";

			this.rm.runToFinish();

			(this.tt.getTimeInSeconds() - this.tt_refuel.getTimeInSeconds()).should.be.within(35, 45);
		});

		it("Bonking is bad", function () {
			console.log("climber penalty = " + this.climber.getPenaltyCount());
			console.log("climber nobonk penalty = " + this.climber_nobonk.getPenaltyCount());

			console.log(this.climber.getAveragePower());
			console.log(this.climber_nobonk.getAveragePower());
			console.log(this.climber.getTimeInSeconds());
			console.log(this.climber_nobonk.getTimeInSeconds());
		});
	});

		/*
		it("Riders can get dropped from their groups", function () {

		});

		it("Downhill sections have difficulty ratings and hairpin-like sections", function () {

		});
		*/
});