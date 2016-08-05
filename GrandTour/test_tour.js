requirejs.config({
	baseUrl: "js/",
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

String.prototype.toHHMMSS = function () {
	var sec_num = parseInt(this, 10); // don't forget the second param
	var hours   = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (hours   < 10) {hours   = "0"+hours;}
	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}
	return hours+':'+minutes+':'+seconds;
};

define(["jquery", "racemanager", "rider", "map"], function ($, RaceManager, Rider, Map) {
	$(function () {
		var flat_mgr = new RaceManager();
		var mtn_mgr = new RaceManager();
		var hill_mgr = new RaceManager();

		var flat_course = new Map( { gradients: [ [0, 0], [150, 0] ] } );
		var mtn_course = new Map( { gradients: [ [0,.12], [20,.12] ] } );
		var hill_course = new Map( { gradients: [ [0, 0], [40,.08], [48,0] ] } );

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

		var rider1 = tt;
		var rider2 = sprinter;

		flat_mgr.addRider(rider1, "#tt-flat-gui");
		flat_mgr.addRider(rider2, "#sagan-flat-gui");

		flat_mgr.setMap(flat_course);

		$("#go").click(onClickGo);
		$("#stop").click(onClickStop);
		$("#reset").click(onClickReset);

		function onClickGo (event) {
			flat_mgr.go(onStep);
		}

		function onClickStop (event) {
			flat_mgr.stop();
		}

		function onClickReset (event) {
			flat_mgr.reset();

			onStep();
		}

		function onStep () {
			var dm, t;

			dm = Math.round(rider1.getDistance() / 10);

			$("#time-trialer .distance").text(dm + " km");

			dm = Math.round(rider2.getDistance() / 10);

			$("#sagan .distance").text(dm + " km");

			t = String(rider1.getTime() * 10).toHHMMSS();

			$("#time-trialer .time").text(t);

			t = String(rider2.getTime() * 10).toHHMMSS();

			$("#sagan .time").text(t);

			$("#header .timer").text(flat_mgr.getTimeElapsed());
		}
	});
});