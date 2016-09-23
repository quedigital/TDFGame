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
	describe("Lookup tables", function () {
		before(function () {
			makeBasicRiders(this);
		});

		it("Lookup tables are populated and symmetrical", function () {
			var power = 540;
			var gradient = 0;
			var distance = this.sprinter.getDistanceFromPower(power, gradient);
			var powerFromLookup = this.sprinter.lookupPowerForDistance(distance, gradient);

			expect(powerFromLookup).to.equal(power);

			power = 370;
			gradient = .1;
			distance = this.tt.getDistanceFromPower(power, gradient);
			powerFromLookup = this.tt.lookupPowerForDistance(distance, gradient);

			expect(powerFromLookup).to.equal(power);

			power = 600;
			gradient = -.08;
			distance = this.tt.getDistanceFromPower(power, gradient);
			powerFromLookup = this.tt.lookupPowerForDistance(distance, gradient);

			expect(powerFromLookup).to.equal(power);
		});

		it("Gradients are rounded in the lookup chart", function () {
			var power1 = this.sprinter.lookupPowerForDistance(.01, 0);
			var power2 = this.sprinter.lookupPowerForDistance(.01,.08);
			var power3 = this.sprinter.lookupPowerForDistance(.01,.078);

			expect(power1).to.be.below(power2);
			expect(power2).to.equal(power3);
		});
	});

	describe("Power Curves", function () {
		before(function () {
			var rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 30 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			var new_riders = {};
			makeBasicRiders(new_riders);

			this.custom_tt = new_riders.tt;
			this.custom_tt.options.name = "Custom TT";

			rm.addRider(this.tt);
			rm.addRider(this.custom_tt);

			rm.escapeRider(this.tt);
			rm.escapeRider(this.custom_tt);

			// tt default =             [1200, 1000, 630, 535, 460, 400, 330]
			this.custom_tt.setPowerCurve(1200, 1000, 660, 550, 480, 410, 330);

			this.rm = rm;
		});

		it("Graph the power curves to make sure they're smooth", function () {
			this.tt.graphPowerCurve($("#graph"), { labels: false, dots: false, color: "blue" });
			this.sprinter.graphPowerCurve($("#graph"), { labels: false, dots: false, color: "yellow" });
			this.climber.graphPowerCurve($("#graph"), { labels: true, dots: true, color: "green" });
		});

		it("Input a power, get a number of seconds that power could be pedaled when fresh", function () {
			this.sprinter.getDurationForPower(1600).should.equal(2);
			//this.sprinter.getDurationForPower(456).should.equal(300);
		});

		it("Riders have different power curves, generating different power", function () {
			this.sprinter.getDurationForPower(1440).should.be.within(4.5, 5.5);
			this.sprinter.getDurationForPower(690).should.be.within(59, 61);
			this.sprinter.getDurationForPower(456).should.be.within(299, 301);
			this.sprinter.getDurationForPower(384).should.be.within(1199, 1201);
			this.sprinter.getDurationForPower(300).should.be.within(10799, 10801);

			this.tt.getPowerCurve().should.not.eql(this.custom_tt.getPowerCurve());
		});

		it("The Custom TT has a higher duration at 450W", function () {
			this.tt.getMultiplierForPower(450).should.be.above(this.custom_tt.getMultiplierForPower(450));
		});

		it("The Custom TT finishes sooner with higher average power (both trying for 480W)", function () {
			this.tt.setEffort( { power: 480 } );
			this.custom_tt.setEffort( { power: 480 } );

			this.rm.runToFinish();

			this.custom_tt.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
			this.custom_tt.getAveragePower().should.be.within(470, 490);
		});

		it("Energy consumption corresponds to power output", function () {
			var basePower = this.tt.getMinPower();
			var mBase = this.tt.getMultiplierForPower(basePower);

			var m1 = this.tt.getMultiplierForPower(100);
			var m2 = this.tt.getMultiplierForPower(200);
			var m3 = this.tt.getMultiplierForPower(300);
			var m4 = this.tt.getMultiplierForPower(400);
			var m5 = this.tt.getMultiplierForPower(500);
			var m6 = this.tt.getMultiplierForPower(1200);

			console.log("100 = " + m1);
			console.log("200 = " + m2);
			console.log("300 = " + m3);
			console.log(basePower + " = " + mBase);
			console.log("400 = " + m4);
			console.log("500 = " + m5);
			console.log("1200 = " + m6);

			expect(mBase).to.equal(1);

			expect(m1).to.be.below(m2);
			expect(m2).to.be.below(m3);
			expect(m3).to.be.below(m4);
			expect(m4).to.be.below(m5);
			expect(m5).to.be.below(m6);
		});

		it("Extreme power curve could have someone easily output 600W but maybe not other ranges", function () {
			expect(1).to.be(0);
		});
	});

	describe("Real-world Performance: Flat Stage", function () {
		before(function () {
		});

		it("Rohan Dennis won a 13.8 km TT in 2015 with a time of 14:46, averaging about 500 watts", function () {
			this.rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [13.8, 0]]});

			makeBasicRiders(this);

			// tt default =      [1200, 1000, 630, 535, 460, 400, 330]
			this.tt.setPowerCurve({ "2s": 1200, "5s": 1000, "60s": 660, "5min": 550, "20min": 475, "45min": 440, "3hrs": 330 });

			this.rm.setMap(flat_course);

			this.tt.setEffort({power: 493});
			this.sprinter.setEffort({power: 396});
			this.climber.setEffort({power: 421});

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);

			this.rm.runToFinish();

			this.tt.getTimeInSeconds().should.be.within(14 * 60, 15 * 60);
			this.tt.getAveragePower().should.be.within(485, 520);
		});

		it("Greipel finishes next, in about 16:07", function () {
			this.sprinter.getTimeInSeconds().should.be.within(16 * 60, 16.5 * 60);
		});

		it("Majka finishes last, in about 16:19", function () {
			this.rm.getTimeGapBetween(this.sprinter, this.climber).should.be.within(10, 20);
			this.sprinter.getTimeInSeconds().should.be.within(16 * 60, 16.5 * 60);
		});
	});

	describe("Real-world Performance: Uphill Finish", function () {
		before(function () {
		});

		it("Vuelta d'Espana, Stage 3 Finish, takes the winner about 6-7 minutes", function () {
			this.rm = new RaceManager();

			var mtn_course = new Map({gradients: [
				[0,.15],
				[1.0,.15],
				[.3,.3],
				[.5,.15]
			]});        // Vuelta 1.8km @ 15-30%, takes about 7-8 minutes

			makeBasicRiders(this);

			this.rm.setMap(mtn_course);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);

			this.tt.setEffort({power: 495});
			this.sprinter.setEffort({power: 385});
			this.climber.setEffort({power: 446});

			this.rm.runToFinish();

			this.climber.getTimeInSeconds().should.be.within(6 * 60, 7 * 60);
		});
	});

	describe("Flat Stage", function () {
		var flat_course, tt, sprinter;

		before(function () {
			this.rm = new RaceManager();

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

	describe("Sprinting Flat Stage", function () {
		before(function () {
			var rm = new RaceManager();
			var flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			rm.addRider(this.sprinter);
			rm.addRider(this.tt);

			rm.makeGroup({ members: [this.tt, this.sprinter], effort: { power: 320 } });

			this.rm = rm;
		});

		it("Sprinter and TT are still together", function () {
			this.rm.runTo({meters: -400});

			this.sprinter.showStats();
			this.tt.showStats();

			(this.rm.getDistanceBetween(this.tt, this.sprinter)).should.be.below(.02);
		});

		it("Sprinter and TT have saved enough energy for sprint", function () {
			(this.sprinter.getFuelPercent()).should.be.above(50);
			(this.tt.getFuelPercent()).should.be.above(50);
		});

		it("Sprinter beats TT in final 400m", function () {
			this.rm.dropFromGroup(this.sprinter);

			// make sure they don't go into the red
			this.tt.setEffort( { power: 860 } );
			this.sprinter.setEffort( { power: 900 });

			this.rm.runToFinish();

			this.sprinter.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});

		it("Sprinter beats TT by about 1 seconds in last 400m", function () {
			(this.tt.getTimeInSeconds() - this.sprinter.getTimeInSeconds()).should.be.within(.5, 1.5);
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

		it("Average power around 350-400 for both", function () {
			expect(this.mtn_tt.getAveragePower()).to.be.within(340, 410);
			expect(this.climber.getAveragePower()).to.be.within(340, 410);
		});

		it("Steep gradient takes about 25 minutes longer to ride than flat course", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.tt.getTimeInSeconds()).to.be.within(24 * 60, 26 * 60);
		});

		it("TT and Climber both pretty much run out of fuel on 12% 8 km climb", function () {
			this.mtn_tt.getFuelPercent().should.be.below(20).and.be.above(0);
			this.climber.getFuelPercent().should.be.below(20).and.be.above(0);
		});

		it("Hill Climb TT average speed is around 13 km/h", function () {
			this.mtn_tt.getAverageSpeed().should.be.within(12, 14);
		});

		it("Climber average speed is around 14 km/h", function () {
			this.climber.getAverageSpeed().should.be.within(13, 15);
		});

		it("Climber wins mountain stage by about 3 minutes", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.climber.getTimeInSeconds()).to.be.within(3 * 60, 3.5 * 60);
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

		it("Ultra-Light Climber is roughly 7 minutes faster than Standard Climber", function () {
			(this.climber.getTimeInSeconds() - this.lite_climber.getTimeInSeconds()).should.be.within(6 * 60, 8 * 60);
		});

		it("Poor Climber is about 30 seconds slower than Standard Climber", function () {
			(this.poor_climber.getTimeInSeconds() - this.climber.getTimeInSeconds()).should.be.within(25, 40);
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

		it("Coasting downhill 15km is 13 minutes faster (~85 km/h, 62mph) than 15km flat", function () {
			(this.tt.getTimeInSeconds() - this.dh.tt.getTimeInSeconds()).should.be.within(12 * 60, 14 * 60);
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
			var order = this.rm.getStageFinishOrder();
			order[0].options.name.should.equal("Time-trialer");
			order[1].options.name.should.equal("Climber");
			order[2].options.name.should.equal("Sprinter");
		});

		it("Full effort should not be as effective as pacing effort", function () {
			this.tt_steady.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});
	});

	describe("Group Dynamics", function () {
		before(function () {
			var rm = new RaceManager();
			var flat_course = new Map({gradients: [[0, 0], [150, 0]]}); // 150 km flat

			rm.setMap(flat_course);

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt1 = new_riders.tt;
			this.tt1.options.name = "A1";

			makeBasicRiders(new_riders);
			this.tt2 = new_riders.tt;
			this.tt2.options.name = "A2";

			makeBasicRiders(new_riders);
			this.tt3 = new_riders.tt;
			this.tt3.options.name = "A3";

			makeBasicRiders(new_riders);
			this.tt4 = new_riders.tt;
			this.tt4.options.name = "A4";

			makeBasicRiders(new_riders);
			this.tt5 = new_riders.tt;
			this.tt5.options.name = "A5";

			makeBasicRiders(new_riders);
			this.bt1 = new_riders.tt;
			this.bt1.options.name = "B1";

			makeBasicRiders(new_riders);
			this.bt2 = new_riders.tt;
			this.bt2.options.name = "B2";

			makeBasicRiders(new_riders);
			this.bt3 = new_riders.tt;
			this.bt3.options.name = "B3";

			makeBasicRiders(new_riders);
			this.bt4 = new_riders.tt;
			this.bt4.options.name = "B4";

			makeBasicRiders(new_riders);
			this.bt5 = new_riders.tt;
			this.bt5.options.name = "B5";

			rm.addRider(this.tt1);
			rm.addRider(this.tt2);
			rm.addRider(this.tt3);
			rm.addRider(this.tt4);
			rm.addRider(this.tt5);

			rm.addRider(this.bt1);
			rm.addRider(this.bt2);
			rm.addRider(this.bt3);
			rm.addRider(this.bt4);
			rm.addRider(this.bt5);

			//this.bt2.setCooperating(false);
			//this.bt3.setCooperating(false);
			this.bt4.setCooperating(false);
			this.bt5.setCooperating(false);

			this.group1 = rm.makeGroup({members: [this.tt1, this.tt2, this.tt3, this.tt4, this.tt5], effort: {power: 300}});
			this.group2 = rm.makeGroup({members: [this.bt1, this.bt2, this.bt3, this.bt4, this.bt5], effort: {power: 300}});

			this.rm = rm;
		});

		it("Groups stay together for first hour, but running out of energy", function () {
			this.group1.setOptions({effort: {power: 360 }});
			this.group2.setOptions({effort: {power: 360 }});

			this.rm.runTo( { hours: 1 });

			expect(this.group1.getDistanceBetween()).to.be.below(35);
			expect(this.group2.getDistanceBetween()).to.be.below(35);

			expect(this.tt1.getFuelPercent()).to.be.below(90);
			expect(this.tt2.getFuelPercent()).to.be.below(90);
			expect(this.tt3.getFuelPercent()).to.be.below(90);
			expect(this.tt4.getFuelPercent()).to.be.below(90);
			expect(this.tt5.getFuelPercent()).to.be.below(90);
		});

		it("Strangely, non-cooperative groups have roughly the same distance and remaining fuel", function () {
			var d1 = this.group1.getGroupAveragePosition();
			var d2 = this.group2.getGroupAveragePosition();

			expect(Math.abs(d1 - d2)).to.be.below(1);

			var f1 = this.tt1.getFuelPercent() + this.tt2.getFuelPercent() + this.tt3.getFuelPercent() + this.tt4.getFuelPercent() + this.tt5.getFuelPercent();
			var f2 = this.bt1.getFuelPercent() + this.bt2.getFuelPercent() + this.bt3.getFuelPercent() + this.bt4.getFuelPercent() + this.bt5.getFuelPercent();

			expect(Math.abs(f1 - f2)).to.be.below(1);
		});

		it("But non-cooperative members have 10-15% more energy", function () {
			expect(this.bt4.getFuelPercent() - this.bt1.getFuelPercent()).to.be.within(10, 15);
		});
	});

	describe("Group versus Breakaway", function () {
		before(function (done) {
			var rm = new RaceManager( { interval: 10, delay: 20 } );

			var gradient = .08;//0.08;

			//*
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
			//*/

			/*
			 var course = new Map({ gradients: [
			 [0,gradient],
			 [50,gradient],
			 [40,gradient]
			 ]});
			 //*/

			rm.setMap(course);

			makeBasicRiders(this);
			this.tt_solo = this.tt;
			this.tt_solo.options.name = "TT Solo";

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt2 = new_riders.tt;
			this.tt2.options.name = "2GTT2";

			makeBasicRiders(new_riders);
			this.tt3 = new_riders.tt;
			this.tt3.options.name = "3GTT3";

			makeBasicRiders(new_riders);
			this.tt4 = new_riders.tt;
			this.tt4.options.name = "4GTT4";

			makeBasicRiders(new_riders);
			this.tt5 = new_riders.tt;
			this.tt5.options.name = "5GTT5";

			rm.addRider(this.tt_solo);
			rm.addRider(this.tt2);
			rm.addRider(this.tt3);
			rm.addRider(this.tt4);
			rm.addRider(this.tt5);

			this.group = rm.makeGroup({ members: [this.tt2, this.tt3, this.tt4, this.tt5], effort: { power: 340 } });

			this.tt_solo.setEffort({ power: 340 });

			this.rm = rm;

			this.rm.runTo( { km: 70, callback: done });
		});

		it("Group stays together after 70km", function () {
			expect(this.rm.getDistanceBetween(this.tt2, this.tt3)).to.be.below(.04);
			expect(this.rm.getDistanceBetween(this.tt2, this.tt4)).to.be.below(.04);
			expect(this.rm.getDistanceBetween(this.tt2, this.tt5)).to.be.below(.04);
		});

		it("With 20km to the finish, the group riders should have more energy than the solo rider", function () {
			this.rm.runTo( { km: -20 });

			expect(this.tt_solo.getFuelPercent()).to.be.below(this.tt2.getFuelPercent());
			expect(this.tt_solo.getFuelPercent()).to.be.below(this.tt3.getFuelPercent());
			expect(this.tt_solo.getFuelPercent()).to.be.below(this.tt4.getFuelPercent());
			expect(this.tt_solo.getFuelPercent()).to.be.below(this.tt5.getFuelPercent());
		});

		it("The gap should be less than 2 minutes between breakaway and peloton", function () {
			var gap = this.rm.getTimeGapBetween(this.tt_solo, this.tt2);

			expect(gap).to.be.within(0, 2.2 * 60);
		});

		it("Group riders haven't used up as much energy as the solo rider", function () {
			expect(this.tt2.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt3.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt4.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
			expect(this.tt5.getFuelPercent()).to.be.above(this.tt_solo.getFuelPercent());
		});

		it("Group finishes with roughly the same time", function () {
			// tt ups his tempo (but not so much he bonks)
			this.tt_solo.setEffort({ power: 370 });

			// group speeds up to catch breakaway rider
			this.group.setOptions({ effort: { power: 512 } });

			this.rm.runToFinish();

			expect(this.rm.getTimeGapBetween(this.tt2, this.tt3)).to.be.below(3);
			expect(this.rm.getTimeGapBetween(this.tt2, this.tt4)).to.be.below(3);
			expect(this.rm.getTimeGapBetween(this.tt2, this.tt5)).to.be.below(3);
		});

		it("Group finishes with the last 8km with a faster average speed (around 56km/h)", function () {
			var group_avg = this.rm.getRiderAverageSpeedBetween(this.tt2, -8, 0);

			var solo_avg = this.rm.getRiderAverageSpeedBetween(this.tt_solo, -8, 0);

			expect(group_avg).to.be.above(solo_avg);
			expect(group_avg).to.be.within(55, 58);
			expect(solo_avg).to.be.within(48, 52);
		});

		it("Breakaway rider gets caught by group by less than 10 seconds", function () {
			expect(this.tt2.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt3.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt4.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt5.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());

			expect(this.rm.getTimeGapBetween(this.tt2, this.tt_solo)).to.be.within(0, 10);
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

		it("Breakaways are hard to get into", function () {

		});
		*/
});