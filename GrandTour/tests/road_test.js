requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "../libs/jquery-2.1.3.min",
		"underscore": "../libs/underscore-min",
		"d3": "../libs/d3.min",
		"easeljs": "../libs/easeljs-0.8.2.min"
	},
	shim: {
		"jquery": {
			exports: "$"
		},
		"easeljs": {
			exports: "createjs"
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

before(function (done) {
	requirejs(["racemanager", "rider", "map", "jquery", "top-view"], function (RaceManager_class, Rider_class, Map_class, $, TopView_class) {
		RaceManager = RaceManager_class;
		Rider = Rider_class;
		Map = Map_class;
		TopView = TopView_class;

		done();
	});
});

describe("Road Test", function () {
	this.timeout(60000);

	describe.only("Peloton", function () {
		before(function (done) {
			var rm = new RaceManager({ interval: 1, delay: 10 });
			var flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			rm.addRider(this.tt);
			rm.addRider(this.sprinter);

			//rm.makeGroup({ members: [this.tt, this.sprinter], effort: { power: 320 } });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { rider: this.tt },
				zoom: 200,
				disabled: true
			});

			this.tv = tv;

			this.rm.addView(tv);

			this.rm.runTo({km: 8, callback: done});
		});

		it("Peloton is together after 8km with Time-trialer leading", function (done) {
			this.sprinter.showStats();
			this.tt.showStats();
			expect(this.rm.getPelotonRange()).to.be.below(4);
			expect(this.tt.getDistance()).to.be.above(this.sprinter.getDistance());

			this.rm.setPelotonEffort( { power: 500 } );

			//this.tv.setDisabled(false);

			this.rm.runToFinish({ callback: done });
		});

		it("Time-trialer speeds up and drops Sprinter", function () {
			this.sprinter.showStats();
			this.tt.showStats();

			expect(this.rm.getTimeGapBetween(this.tt, this.sprinter)).to.be.above(15);
			expect(this.rm.getPelotonSize()).to.be(1);
		});
	});

	describe("Top view: flat course", function () {
		before(function (done) {
			this.rm = new RaceManager();

			flat_course = new Map({gradients: [[0, 0], [15, 0]]});

			makeBasicRiders(this);

			this.rm.setMap(flat_course);
			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);

			var tv = new TopView( { container: $("#race-view") } );

			this.rm.addView(tv);

			this.rm.runTo({ km: 7.5, callback: done });
		});

		it("Red (time-trialer) leads after 7.5km", function () {
			expect(this.rm.getLeaderColor()).to.be("red");
		});
	});

	describe("4-Person Collaborating Group versus Non-collaborating", function () {
		before(function (done) {
			var rm = new RaceManager( { interval: 1, delay: 100 } );

			var gradient = .08;

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

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt11 = new_riders.tt;
			this.tt11.options.name = "1G1R1";

			makeBasicRiders(new_riders);
			this.tt12 = new_riders.tt;
			this.tt12.options.name = "2G1R2";

			makeBasicRiders(new_riders);
			this.tt13 = new_riders.tt;
			this.tt13.options.name = "3G1R3";

			makeBasicRiders(new_riders);
			this.tt14 = new_riders.tt;
			this.tt14.options.name = "4G1R4";

			makeBasicRiders(new_riders);
			this.tt21 = new_riders.tt;
			this.tt21.options.name = "1G2R1";

			makeBasicRiders(new_riders);
			this.tt22 = new_riders.tt;
			this.tt22.options.name = "2G2R2";
			this.tt22.setCooperating(false);

			makeBasicRiders(new_riders);
			this.tt23 = new_riders.tt;
			this.tt23.options.name = "3G2R3";
			this.tt23.setCooperating(false);

			makeBasicRiders(new_riders);
			this.tt24 = new_riders.tt;
			this.tt24.options.name = "4G2R4";
			this.tt24.setCooperating(false);

			rm.addRider(this.tt11);
			rm.addRider(this.tt12);
			rm.addRider(this.tt13);
			rm.addRider(this.tt14);
			rm.addRider(this.tt21);
			rm.addRider(this.tt22);
			rm.addRider(this.tt23);
			rm.addRider(this.tt24);

//			this.group1 = rm.makeGroup({ members: [this.tt11, this.tt12, this.tt13, this.tt14], effort: { power: 375 }, timeInFront: 10 });
			this.group1 = rm.makeGroup({ members: [this.tt11, this.tt12], effort: { power: 375 }, timeInFront: 10 });
			this.group2 = rm.makeGroup({ members: [this.tt21, this.tt22, this.tt23, this.tt24], effort: { power: 375 }, timeInFront: 10 });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { group: this.group2 },
				zoom: 1000,
				disabled: false
			});

			this.rm.addView(tv);

			this.rm.runToFinish({ callback: done });
		});

		it("Non-collaborating group runs out of gas and finishes after Collaborating group", function () {
			this.group1.showStats();
			this.group2.showStats();
			expect(this.group1.getGroupAverageSpeed()).to.be.above(this.group2.getGroupAverageSpeed());
			expect(this.group1.getAverageFinishTime()).to.be.below(this.group2.getAverageFinishTime());
		});
	});

	describe("Pull Duration", function () {
		before(function (done) {
			var rm = new RaceManager( { interval: 1, delay: 100 } );

			var gradient = .08;

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

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt11 = new_riders.tt;
			this.tt11.options.name = "1G1R1";

			makeBasicRiders(new_riders);
			this.tt12 = new_riders.tt;
			this.tt12.options.name = "2G1R2";

			makeBasicRiders(new_riders);
			this.tt13 = new_riders.tt;
			this.tt13.options.name = "3G1R3";

			makeBasicRiders(new_riders);
			this.tt14 = new_riders.tt;
			this.tt14.options.name = "4G1R4";

			makeBasicRiders(new_riders);
			this.tt21 = new_riders.tt;
			this.tt21.options.name = "1G2R1";
			this.tt21.options.timeInFrontPercent = 200;

			makeBasicRiders(new_riders);
			this.tt22 = new_riders.tt;
			this.tt22.options.name = "2G2R2";
			this.tt22.options.timeInFrontPercent = 300;

			makeBasicRiders(new_riders);
			this.tt23 = new_riders.tt;
			this.tt23.options.name = "3G2R3";
			this.tt23.options.timeInFrontPercent = 200;

			makeBasicRiders(new_riders);
			this.tt24 = new_riders.tt;
			this.tt24.options.name = "4G2R4";
			this.tt24.options.timeInFrontPercent = 200;

			rm.addRider(this.tt11);
			rm.addRider(this.tt12);
			rm.addRider(this.tt13);
			rm.addRider(this.tt14);

			rm.addRider(this.tt21);
			rm.addRider(this.tt22);
			rm.addRider(this.tt23);
			rm.addRider(this.tt24);

			this.group1 = rm.makeGroup({ members: [this.tt11, this.tt12, this.tt13, this.tt14], effort: { power: 375 }, timeInFront: 10, name: "Short Turn" });
			this.group2 = rm.makeGroup({ members: [this.tt21, this.tt22, this.tt23, this.tt24], effort: { power: 375 }, timeInFront: 10, name: "Long Turn" });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { group: this.group2 },
				zoom: 1000,
				disabled: true
			});

			this.rm.addView(tv);

			this.rm.runToFinish({ callback: done });
		});

		it("Groups with some riders taking longer turns at the front finish faster with more fuel", function () {
			this.group1.showStats();
			this.group2.showStats();
			expect(this.group2.getGroupAverageSpeed()).to.be.above(this.group1.getGroupAverageSpeed());
			expect(this.group2.getAverageFinishTime()).to.be.below(this.group1.getAverageFinishTime());
			expect(this.group2.getRemainingFuel()).to.be.above(this.group1.getRemainingFuel());
		});
	});

	describe("Groups of Different Sizes", function () {
		before(function (done) {
			var rm = new RaceManager( { interval: 1, delay: 100 } );

			var gradient = .08;

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

			var new_riders = {};

			makeBasicRiders(new_riders);
			this.tt11 = new_riders.tt;
			this.tt11.options.name = "1G1R1";

			makeBasicRiders(new_riders);
			this.tt12 = new_riders.tt;
			this.tt12.options.name = "2G1R2";

			makeBasicRiders(new_riders);
			this.tt13 = new_riders.tt;
			this.tt13.options.name = "3G1R3";

			makeBasicRiders(new_riders);
			this.tt14 = new_riders.tt;
			this.tt14.options.name = "4G1R4";

			makeBasicRiders(new_riders);
			this.tt21 = new_riders.tt;
			this.tt21.options.name = "1G2R1";

			makeBasicRiders(new_riders);
			this.tt22 = new_riders.tt;
			this.tt22.options.name = "2G2R2";

			makeBasicRiders(new_riders);
			this.tt23 = new_riders.tt;
			this.tt23.options.name = "3G2R3";

			makeBasicRiders(new_riders);
			this.tt24 = new_riders.tt;
			this.tt24.options.name = "4G2R4";

			makeBasicRiders(new_riders);
			this.tt25 = new_riders.tt;
			this.tt25.options.name = "5G2R5";

			makeBasicRiders(new_riders);
			this.tt26 = new_riders.tt;
			this.tt26.options.name = "6G2R6";

			rm.addRider(this.tt11);
			rm.addRider(this.tt12);
			rm.addRider(this.tt13);
			rm.addRider(this.tt14);

			rm.addRider(this.tt21);
			rm.addRider(this.tt22);
			rm.addRider(this.tt23);
			rm.addRider(this.tt24);
			rm.addRider(this.tt25);
			rm.addRider(this.tt26);

			this.group1 = rm.makeGroup({ members: [this.tt11, this.tt12, this.tt13, this.tt14], effort: { power: 395 }, timeInFront: 10 });
			this.group2 = rm.makeGroup({ members: [this.tt21, this.tt22, this.tt23, this.tt24, this.tt25, this.tt26], effort: { power: 408 }, timeInFront: 10 });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { group: this.group2 },
				zoom: 1000,
				disabled: true
			});

			this.rm.addView(tv);

			this.rm.runToFinish({ callback: done });
		});

		it("Larger groups are able to finish faster", function () {
			expect(this.group2.getGroupAverageSpeed()).to.be.above(this.group1.getGroupAverageSpeed());
			expect(this.group2.getAverageFinishTime()).to.be.below(this.group1.getAverageFinishTime());
		});
	});

	describe("Group versus Breakaway", function () {
		before(function (done) {
			var rm = new RaceManager( { interval: 1, delay: 100 } );

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
			//this.tt4.setCooperating(false);

			makeBasicRiders(new_riders);
			this.tt5 = new_riders.tt;
			this.tt5.options.name = "5GTT5";
			//this.tt5.setCooperating(false);

			makeBasicRiders(new_riders);
			this.tt6 = new_riders.tt;
			this.tt6.options.name = "6GTT6";
			//this.tt6.setCooperating(false);
			//this.tt6.options.timeInFrontPercent = 100;

			rm.addRider(this.tt_solo);
			rm.addRider(this.tt2);
			rm.addRider(this.tt3);
			rm.addRider(this.tt4);
			rm.addRider(this.tt5);
			rm.addRider(this.tt6);

			this.group = rm.makeGroup({ members: [this.tt2, this.tt3, this.tt4, this.tt5, this.tt6], effort: { power: 345 }, timeInFront: 10 });

			this.tt_solo.setEffort({ power: 340 });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { group: this.group },//{ rider: this.tt_solo }
				zoom: 1000,
				disabled: true
			});

			this.rm.addView(tv);

			this.rm.runTo( { km: 70, callback: done });
		});

		it("Group stays together after 80km", function () {
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

		it("The gap should be about 1 minute between breakaway and peloton", function () {
			this.tt_solo.showStats();
			this.tt2.showStats();
			this.tt3.showStats();
			this.tt4.showStats();
			this.tt5.showStats();

			var gap = this.rm.getTimeGapBetween(this.tt_solo, this.tt2);
			console.log("gap = " + gap);

			expect(gap).to.be.within(.5 * 60, 1.5 * 60);
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
			this.group.setOptions({ effort: { power: 475 } });

			this.rm.runToFinish();

			expect(this.rm.getTimeGapBetween(this.tt2, this.tt3)).to.be.below(3);
			expect(this.rm.getTimeGapBetween(this.tt2, this.tt4)).to.be.below(3);
			expect(this.rm.getTimeGapBetween(this.tt2, this.tt5)).to.be.below(3);
		});

		it("Group finishes with the last 8km with an average speed of 50km/h", function () {
			var avg = this.rm.getRiderAverageSpeedBetween(this.tt2, -8, 0);
			console.log("tt2 finishing average speed = " + avg);

			avg = this.rm.getRiderAverageSpeedBetween(this.tt_solo, -8, 0);
			console.log("tt_solo finishing average speed = " + avg);
		});

		it("Breakaway rider gets caught by group by about 25-50 seconds", function () {
			console.log("****");

			this.tt_solo.showStats();
			this.tt2.showStats();
			this.tt3.showStats();
			this.tt4.showStats();
			this.tt5.showStats();
			this.tt6.showStats();

			expect(this.tt2.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt3.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt4.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());
			expect(this.tt5.getTimeInSeconds()).to.be.below(this.tt_solo.getTimeInSeconds());

			expect(this.rm.getTimeGapBetween(this.tt2, this.tt_solo)).to.be.within(25, 50);
		});
	});

	describe("Top view: lumpy course", function () {
		before(function (done) {
			this.rm = new RaceManager();

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

			makeBasicRiders(this);

			this.rm.setMap(course);
			this.rm.addRider(this.tt);
			this.rm.addRider(this.sprinter);
			this.rm.addRider(this.climber);

			var tv = new TopView( { container: $("#race-view") } );

			this.rm.addView(tv);

			this.rm.runToFinish({ callback: done });
		});

		it("Blue (climber) wins, followed by Red (tt), and Green (sprinter)", function () {
			var riders = this.rm.getStageFinishOrder();
			expect(riders[0].options.name).to.equal("Climber");
			expect(riders[1].options.name).to.equal("Time-trialer");
			expect(riders[2].options.name).to.equal("Sprinter");
		});
	});

	describe("Sprinting Flat Stage", function () {
		before(function (done) {
			var rm = new RaceManager({ interval: 1, delay: 10 });
			var flat_course = new Map({gradients: [[0, 0], [15, 0]]}); // 15 km flat

			rm.setMap(flat_course);

			makeBasicRiders(this);

			rm.addRider(this.sprinter);
			rm.addRider(this.tt);

			rm.makeGroup({ members: [this.tt, this.sprinter], effort: { power: 320 } });

			this.rm = rm;

			var tv = new TopView({
				container: $("#race-view"),
				focus: { rider: this.tt },
				zoom: 200,
				disabled: false
			});

			this.rm.addView(tv);

			this.rm.runTo({meters: -400, callback: done});
		});

		it("Sprinter and TT are still together", function () {
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

			this.tt.setEffort( { power: 860 } );
			this.sprinter.setEffort( { power: 990 });

			this.rm.runToFinish();

			this.sprinter.showStats();
			this.tt.showStats();

			this.sprinter.getTimeInSeconds().should.be.below(this.tt.getTimeInSeconds());
		});

		it("Sprinter beats TT by about 2 second in last 400m", function () {
			(this.tt.getTimeInSeconds() - this.sprinter.getTimeInSeconds()).should.be.within(1, 3);
		});
	});
});