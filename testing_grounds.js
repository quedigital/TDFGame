var mgr;
var marker;

requirejs.config({
	baseUrl: "js/",
	paths: {
		"jquery": "jquery-2.1.3.min",
		"jquery.ui": "jquery-ui.min",
		"bootstrap": "bootstrap.min",
		"epoly": "v3_epoly",
		/*"raphael": "raphael-min"*/
	},
	shim: {
		"jquery": {
			exports: "$"
		},
		"bootstrap": {
			exports: "$",
			deps: ['jquery']
		}
		/*
		"raphael": {
			exports: "Raphael"
		}
		*/
	}
});

define(["jquery", "racemanager", "bootstrap", "ridercontrol"], function ($, RaceManager) {
	var playing = false;

	var SECS_PER_TURN = 10;
	var UPDATES_PER_SECOND = 10;

	$(function () {
		mgr = new RaceManager({ canvas: "#map-canvas", gpx: "maps/MapMyTrack-Route-Stage-20-Modane-Valfréjus---AlpedHuez.gpx", onMapLoaded: onMapLoaded });

		$("#turn").click(onTurn);
		$("#play").click(onPlay);
	});

	function onMapLoaded () {
		mgr.addRider({ name: "Quintana", number: 51, slowTwitch: 80, fastTwitch: 18, currentDistance: 1 });
		mgr.addRider({ name: "Froome", number: 31, slowTwitch: 87, fastTwitch: 21, currentDistance: 1 });

		$(".rider-control").RiderControl( { mgr: mgr, riders: mgr.getRiders([31, 51]) } );
		$(".rider-control").RiderControl("selectFirstRider");
	}

	function onTurn () {
		mgr.setRiderExertion(31, .5);
		mgr.setRiderExertion(51, .5);

		doTurn();
	}

	function onPlay () {
		if (!playing) {
			mgr.setRiderExertion(31, .5);
			mgr.setRiderExertion(51, .5);

			playing = true;

			gotoPlay();

			$("#play").text("Pause");
		} else {
			playing = false;

			$("#play").text("Go");
		}
	}

	function doTurn () {
		var options = { secondsPerTurn: SECS_PER_TURN, updatesPerSecond: UPDATES_PER_SECOND };

		mgr.turn(options);

		$(".game-container").trigger("rider-update", options);
	}

	function gotoPlay () {
		if (mgr.noWinner() && playing) {
			doTurn();

			setTimeout(gotoPlay, 1000 / UPDATES_PER_SECOND);
		} else if (!mgr.noWinner()) {
			alert("Winner!");
		}
	}
});