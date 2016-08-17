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
		maxPower: 1200,
		ftpPower: 500,
		recovery: 320,
		acceleration: 40,
		weight: 70,
		flatAbility: .8,
		climbingAbility: .2,
		descendingAbility:.5
	});

	var sprinter = new Rider({
		name: "Sprinter",
		maxPower: 1650,
		ftpPower: 465,
		recovery: 305,
		acceleration: 800,
		weight: 90,
		flatAbility: .7,
		climbingAbility: .1,
		descendingAbility:.7
	});

	var climber = new Rider({
		name: "Climber",
		maxPower: 1100,
		ftpPower: 455,
		recovery: 325,
		acceleration: 30,
		weight: 60,
		flatAbility: .65,
		climbingAbility: .8,
		descendingAbility:.6
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

			flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 15 km, Rohan Dennis won a 13.8 km TT in 2015 with a time of 14:46, averaging about 500 watts.

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);
			this.tt_full = new_riders.tt;

			this.rm.setMap(flat_course);

			this.tt.setEffort({ power: 500 });
			this.sprinter.setEffort({ power: 465 });
			this.tt_full.setEffort(1);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.tt_full);

			this.rm.runToFinish();
		});

		it("Flat course is 15km", function () {
			flat_course.getTotalDistance().should.equal(15);
		});

		it("TT average speed is between 45 and 55 km/h", function () {
			this.tt.getAverageSpeed().should.be.within(45, 55);
		});

		it("Sprinter is about 2 minutes slower than TT over 15 km flat stage", function () {
			(this.sprinter.getTimeInSeconds() - this.tt.getTimeInSeconds()).should.be.within(100, 140);
		});

		it("Going full out is less effective than a steady rate", function () {
			this.tt_full.getTimeInSeconds().should.be.above(this.tt.getTimeInSeconds());
		});

		it("TT Energy at the end should be about zero", function () {
			this.tt.getFuelPercent().should.be.below(5);
		});
	});

	describe("Sprinting", function () {
		before(function () {
			var rm = new RaceManager();
			var flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			rm.addRider(this.sprinter);
			rm.addRider(this.tt);

			this.tt.setEffort( { power: 300 });
			this.sprinter.setEffort( { power: 300 });
			rm.makeGroup({ members: [this.tt, this.sprinter] });
			rm.runTo({ meters: -800 });

			this.rm = rm;
		});

		it("Sprinter and TT have saved enough energy for sprint", function () {
			(this.sprinter.getFuelPercent()).should.be.above(50);
			(this.tt.getFuelPercent()).should.be.above(50);
		});

		it("Sprinter beats TT in final 800m", function () {
			this.tt.setEffort(1);
			this.sprinter.setEffort(1);
			this.rm.dropFromGroup(this.sprinter);

			this.rm.runToFinish();

			this.sprinter.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});

		it("Sprinter beats TT by about 5 seconds in last 800m", function () {
			(this.tt.getTimeInSeconds() - this.sprinter.getTimeInSeconds()).should.be.within(3, 7);
		});
	});

	describe("Hill Climb", function () {
		before(function () {
			var rm = new RaceManager();
			var mtn_rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [8, 0]]});       // 8 km flat
			var mtn_course = new Map({gradients: [[0, .12], [8, .12]]});    // 8 km @ 12%

			makeBasicRiders(this);

			rm.addRider(this.tt);

			var new_riders = {};
			makeBasicRiders(new_riders);
			this.mtn_tt = new_riders.tt;

			this.mtn_tt.setEffort({ power: 430 });
			this.climber.setEffort({ power: 430 });

			this.climber.options.name = "Bob";

			mtn_rm.addRider(this.mtn_tt);
			mtn_rm.addRider(this.climber);

			rm.setMap(flat_course);
			mtn_rm.setMap(mtn_course);

			rm.runToFinish();
			mtn_rm.runToFinish();
		});

		it("Average power around 430 for both", function () {
			expect(this.mtn_tt.getAveragePower()).to.be.within(410, 440);
			expect(this.climber.getAveragePower()).to.be.within(410, 440);
		});

		it("Steep gradient takes about 20 minutes longer to ride than flat course", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.tt.getTimeInSeconds()).to.be.within(19 * 60, 23 * 60);
		});

		it("TT and Climber both pretty much run out of fuel on 12% 8 km climb", function () {
			this.mtn_tt.getFuelPercent().should.be.below(20).and.be.above(0);
			this.climber.getFuelPercent().should.be.below(20).and.be.above(0);
		});

		it("Hill Climb TT average speed is around 14 km/h", function () {
			this.mtn_tt.getAverageSpeed().should.be.within(13, 15);
		});

		it("Climber average speed is around 24 km/h", function () {
			this.climber.getAverageSpeed().should.be.within(23, 25);
		});

		it("Climber wins mountain stage by about 13 minutes", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.climber.getTimeInSeconds()).to.be.within(12 * 60, 14 * 60);
		});
	});

	describe("Power Curves", function () {
		before(function () {
			var rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [30, 0]]}); // 30 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);

			this.custom_tt = new_riders.tt;

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
			this.custom_tt.getAveragePower().should.be.within(440, 460);
		});
	});

	describe("Climbing Ability", function () {
		before(function () {
			var rm = new RaceManager();

			var mtn_course = new Map({gradients: [[0,.12], [8,.12]]}); // 8 km @ 12%

			rm.setMap(mtn_course);

			makeBasicRiders(this);

			var new_rider1 = {}, new_rider2 = {};

			makeBasicRiders(new_rider1);
			makeBasicRiders(new_rider2);

			this.lite_climber = new_rider1.climber;
			this.lite_climber.options.name = "Lite Climber";
			this.lite_climber.options.weight = 50;  // vs 60

			this.poor_climber = new_rider2.climber;
			this.poor_climber.options.name = "Poor Climber";
			this.poor_climber.options.climbingAbility = .75; // vs .8

			rm.addRider(this.tt);
			rm.addRider(this.climber);
			rm.addRider(this.lite_climber);
			rm.addRider(this.poor_climber);

			rm.runToFinish();
		});

		it("Ultra-Light Climber is roughly 6 minutes faster than Standard Climber", function () {
			(this.climber.getTimeInSeconds() - this.lite_climber.getTimeInSeconds()).should.be.within(5 * 60, 7 * 60);
		});

		it("Poor Climber is about a minute slower than Standard Climber", function () {
			(this.poor_climber.getTimeInSeconds() - this.climber.getTimeInSeconds()).should.be.within(55, 70);
		});
	});

	describe("Downhill", function () {
		before(function () {
			var rm = new RaceManager();
			var rm2 = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [15, 0]]});         // 15 km flat
			var downhill_course = new Map({gradients: [[0,-.12], [15,-.12]]}); // 15 km @ -12%

			rm.setMap(flat_course);
			rm2.setMap(downhill_course);

			this.dh = {}, this.power = {}, this.descender = {};

			makeBasicRiders(this);
			makeBasicRiders(this.dh);
			makeBasicRiders(this.power);
			makeBasicRiders(this.descender);

			this.tt.setEffort(1);
			this.dh.tt.setEffort(0.01);
			this.power.tt.options.name = "Power Downhill";
			this.power.tt.setEffort( { power: 500 } );
			this.descender.tt.options.name = "Good Descender";
			this.descender.tt.options.descendingAbility = .7; //vs .5
			this.descender.tt.setEffort( { power: 500 });

			rm.addRider(this.tt);
			rm2.addRider(this.dh.tt);
			rm2.addRider(this.power.tt);
			rm2.addRider(this.descender.tt);

			rm.runToFinish();
			rm2.runToFinish();
		});

		it("Coasting downhill 15km is 10-13 minutes faster (~85 km/h, 62mph) than 15km flat", function () {
			(this.tt.getTimeInSeconds() - this.dh.tt.getTimeInSeconds()).should.be.within(10 * 60, 14 * 60);
			this.dh.tt.getAverageSpeed().should.be.within(80, 95);
		});

		it("Coasting downhill uses hardly any power", function () {
			this.tt.getAveragePower().should.be.within(260, 300);
			this.dh.tt.getAveragePower().should.be.within(1, 20);
		});

		it("A good descender beats an average descender by about 30 seconds", function () {
			(this.power.tt.getTimeInSeconds() - this.descender.tt.getTimeInSeconds()).should.be.within(25, 40);
		});

		it("Using power downhill is about a minute faster than coasting", function () {
			(this.dh.tt.getTimeInSeconds() - this.power.tt.getTimeInSeconds()).should.be.within(.5 * 60, 1.5 * 60);
		});
	});

	describe("Rolling Course", function () {
		before(function () {
			var rm = new RaceManager();

			var gradient = 0.08;

			var rolling_course = new Map({gradients: [
				[0, 0],
				[20, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[20, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[20, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[20, 0]
			]});         // 125 km with 3 hills

			rm.setMap(rolling_course);

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);

			this.tt_steady = new_riders.tt;
			this.tt_steady.setEffort({ power: 350 });
			this.climber.setEffort({ power: 350 });
			this.sprinter.setEffort({ power: 350 });

			rm.addRider(this.tt);
			rm.addRider(this.climber);
			rm.addRider(this.sprinter);
			rm.addRider(this.tt_steady);

			rm.runToFinish();

			this.rm = rm;
		});

		it("Course is 125 km", function () {
			this.rm.getStageDistance().should.be.equal(125);
		});

		it("Winner takes about 3 hours", function () {
			this.tt_steady.getTimeInSeconds().should.be.within(2.5 * 60 * 60, 4 * 60 * 60);
		});

		it("Finish order for rolling 8% course @ full effort: TT, Climber, Sprinter", function () {
			this.tt_steady.getTimeInSeconds().should.be.below(this.climber.getTimeInSeconds());
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
				[10, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[10, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[10, 0],
				[5, gradient],
				[5,0],
				[5, -gradient],
				[20, 0]
			]});         // 95 km with 3 hills and a finishing straight

			rm.setMap(course);

			makeBasicRiders(this);
			this.tt_solo = this.tt;
			this.tt_solo.options.name = "TT Solo";

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt2 = new_riders.tt;
			this.tt2.options.name = "GTT2";

			makeBasicRiders(new_riders);
			this.tt3 = new_riders.tt;
			this.tt3.options.name = "GTT3";

			makeBasicRiders(new_riders);
			this.tt4 = new_riders.tt;
			this.tt4.options.name = "GTT4";

			makeBasicRiders(new_riders);
			this.tt5 = new_riders.tt;
			this.tt5.options.name = "GTT5";

			rm.addRider(this.tt_solo);
			rm.addRider(this.tt2);
			rm.addRider(this.tt3);
			rm.addRider(this.tt4);
			rm.addRider(this.tt5);

			rm.makeGroup({ members: [this.tt2, this.tt3, this.tt4, this.tt5], power: 345 });

			this.tt_solo.setEffort({ power: 352 });

			this.rm = rm;
		});

		it("Course is 95 km", function () {
			this.rm.getStageDistance().should.be.equal(95);
		});

		it("With leader 6km from finish, the gap should be about 2 minutes between breakaway and peloton", function () {
			this.rm.runTo( { km: -6 });

			var gap = this.rm.getTimeGapBetween(this.tt_solo, this.tt2);

			expect(gap).to.be.within(1.5 * 60, 2.5 * 60);
		});

		it("Group finishes with the same time", function () {
			// group speeds up to catch breakaway rider
			this.rm.setGroupEffort(this.tt2, { power: 520 });

			this.rm.runToFinish();

			this.tt_solo.showStats();
			this.tt2.showStats();
			this.tt3.showStats();
			this.tt4.showStats();
			this.tt5.showStats();

			expect(this.tt2.getTime()).to.equal(this.tt3.getTime()).and.equal(this.tt4.getTime()).and.equal(this.tt5.getTime());
		});

		it("Group riders don't use up as much energy as the solo rider", function () {
			expect(this.tt2.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt3.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt4.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt5.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
		});

		it("Breakaway rider gets caught by group", function () {
			expect(this.tt2.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt3.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt4.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt5.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
		});
	});

	describe("Refueling and Redzoning", function () {
		var flat_course, tt, sprinter;

		before(function () {
			this.rm = new RaceManager();
			this.rm2 = new RaceManager();

			flat_course = new Map({gradients: [[0, 0], [150, 0]]});    // 150 km
			var flat_course2 = new Map({gradients: [[0, 0], [150, 0]]});    // 150 km

			makeBasicRiders(this);

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt_refuel = new_riders.tt;
			this.climber_nopenalty = new_riders.climber;

			this.climber.setEffort({ power: 320 });
			this.climber_nopenalty.setEffort({ power: 320 });
			this.climber_nopenalty.options.redzonePenalty = false;

			this.tt.setEffort({ power: 470 });
			this.tt_refuel.setEffort({ power: 470 });

			this.rm.setMap(flat_course);
			this.rm2.setMap(flat_course2);

			this.rm.addRider(this.climber);
			this.rm.addRider(this.climber_nopenalty);
			this.rm2.addRider(this.tt);
			this.rm2.addRider(this.tt_refuel);
		});

		it("Refueling even once finishes about 3 minutes faster", function () {
			this.rm.runTo({ km: -5 });
			this.rm2.runTo({ km: -5 });

			this.climber.getDistance().should.equal(this.climber_nopenalty.getDistance());

			this.tt_refuel.getFuelPercent().should.be.below(1);

			this.tt_refuel.refuel({ percent: 100 });

			this.tt_refuel.getFuelPercent().should.equal(100);

			this.climber.refuel({ value: 400 });
			this.climber_nopenalty.refuel({ value: 400 });

			this.climber.resetRedzoneCount();
			this.climber_nopenalty.resetRedzoneCount();

			this.climber_nopenalty.setEffort(1);
			this.climber.setEffort(1);
			this.climber.options.name = "Climber with Redzone Penalty";

			this.rm.runToFinish();
			this.rm2.runToFinish();

			this.tt.getFuelPercent().should.be.below(5);
			this.tt_refuel.getFuelPercent().should.be.above(50);

			(this.tt.getTimeInSeconds() - this.tt_refuel.getTimeInSeconds()).should.be.within(2 * 60, 4 * 60);
		});

		it("Redzone penalty (ie, exerting with no fuel) is costly, about a minute in final 5k", function () {
			this.climber.getRedzoneCount().should.be.above(100);
			this.climber_nopenalty.getRedzoneCount().should.equal(0);

			(this.climber.getTimeInSeconds() - this.climber_nopenalty.getTimeInSeconds()).should.be.within(.75 * 60, 1.25 * 60);
		});
	});

		/*
		it("Riders can get dropped from their groups", function () {

		});

		it("Downhill sections have difficulty ratings and hairpin-like sections", function () {

		});

		it("A group that's cooperating is faster than a group that's not", function () {

		});
		*/
});