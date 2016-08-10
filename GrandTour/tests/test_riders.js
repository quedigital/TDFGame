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
		maxPower: 1600,
		acceleration: 50,
		recovery: 305,
		weight: 70,
		flatAbility: .8,
		climbingAbility: .2
	});

	var sprinter = new Rider({
		name: "Sprinter",
		maxPower: 1600,
		acceleration: 100,
		recovery: 305,
		weight: 90,
		flatAbility: .75,
		climbingAbility: .3
	});

	var climber = new Rider({
		name: "Climber",
		maxPower: 1200,
		acceleration: 30,
		recovery: 305,
		weight: 60,
		flatAbility: .7,
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

			flat_course = new Map({gradients: [[0, 0], [150, 0]]});

			makeBasicRiders(this);

			this.rm.setMap(flat_course);

			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);

			this.rm.runToFinish();
		});

		it("Flat course is 15km", function () {
			flat_course.getTotalDistance().should.equal(150);
		});

		it("TT average speed is between 40 and 50 km/h", function () {
			this.tt.getAverageSpeed().should.be.within(40, 50);
		});

		it("TT average power is between 350 and 400", function () {
			this.tt.getAveragePower().should.be.within(350, 400);
		});

		it("Sprinter average power is between 325 and 375", function () {
			this.sprinter.getAveragePower().should.be.within(325, 375);
		});

		it("Sprinter is slower than TT over 15 km flat stage", function () {
			this.sprinter.getTimeInSeconds().should.be.above(this.tt.getTimeInSeconds());
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

			this.tt.setEffort(.5);
			this.sprinter.setEffort(.5);
			rm.makeGroup([this.tt, this.sprinter]);
			rm.runToMeters(-800);

			this.tt.setEffort(1);
			this.sprinter.setEffort(1);
			this.sprinter.leaveGroup();
			rm.runToFinish();
		});

		it("Sprinter beats TT in final 800m", function () {
			this.sprinter.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});

		it("Sprinter beats TT by 5-10 seconds", function () {
			(this.tt.getTimeInSeconds() - this.sprinter.getTimeInSeconds()).should.be.within(5, 10);
		});
	});

	describe("Mountain Stage", function () {
		before(function () {
			var rm = new RaceManager();
			var mtn_rm = new RaceManager();

			var flat_course = new Map({gradients: [[0, 0], [80, 0]]});       // 8 km flat
			var mtn_course = new Map({gradients: [[0, .12], [80, .12]]});    // 8 km @ 12%

			makeBasicRiders(this);

			rm.addRider(this.tt);

			this.mtn_tt = $.extend({}, this.tt);
			mtn_rm.addRider(this.mtn_tt);
			mtn_rm.addRider(this.climber);

			rm.setMap(flat_course);
			mtn_rm.setMap(mtn_course);

			rm.runToFinish();
			mtn_rm.runToFinish();
		});

		it("Gradient takes 30 to 35 minutes longer to ride than flat course", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.tt.getTimeInSeconds()).to.be.within(60 * 30, 60 * 35);
		});

		it("Mountain TT average speed is around 12 km/h", function () {
			this.mtn_tt.getAverageSpeed().should.be.within(10, 15);
		});

		it("Climber wins mountain stage by 3 or 4 minutes", function () {
			expect(this.mtn_tt.getTimeInSeconds() - this.climber.getTimeInSeconds()).to.be.within(3 * 60, 4 * 60);
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

		it("Poor Climber is 55 to 60 seconds slower than Standard Climber", function () {
			(this.poor_climber.getTimeInSeconds() - this.climber.getTimeInSeconds()).should.be.within(55, 60);
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

			rm.addRider(this.tt);
			rm.addRider(this.climber);
			rm.addRider(this.sprinter);

			rm.runToFinish();

			this.rm = rm;
		});

		it("Course is 125km", function () {
			this.rm.getStageDistance().should.be.equal(1250);
		});

		it("Finish order for rolling 8% course: TT, Climber, Sprinter", function () {
			this.tt.getTimeInSeconds().should.be.below(this.climber.getTimeInSeconds());
			this.climber.getTimeInSeconds().should.be.below(this.sprinter.getTimeInSeconds());
		});
	});

		/*
		it("Riders can get dropped from their groups", function () {

		});

		it("Downhill sections have difficulty ratings and hairpin-like sections", function () {

		});
		*/
});