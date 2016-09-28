define(["top-view", "rider-controller", "team-controller", "standings-view"], function (TopView, RiderController, TeamController, StandingsView) {
	function RaceInterface(options) {
		this.options = options != undefined ? options : {};

		$("body").addClass("controller");

		var fullscreen = $("<div>", { class: "fullscreen" } );
		var raceview = $("<div>", { id: "race-view" } );
		fullscreen.append(raceview);
		var controller = $("<div>", { id: "focus-rider", class: "controller-container" } );
		fullscreen.append(controller);
		var team1 = $("<div>", { id: "team1" } );
		fullscreen.append(team1);
		var standings = $("<div>", { id: "overall-standings" } );
		fullscreen.append(standings);

		$("body").prepend(fullscreen);

		this.fullscreen = fullscreen;
		this.raceviewDOM = raceview;
		this.controllerDOM = controller;
		this.teamDOM = team1;

		var tv = new TopView({
			container: raceview,
			focus: {rider: this.options.focus},
			zoom: 200,
			disabled: false,
			raceManager: this.options.raceManager
		});

		var live_standings = new StandingsView({
			container: standings,
			raceManager: this.options.raceManager
		});

		this.topView = tv;

		this.options.raceManager.addView(tv);
		this.options.raceManager.addView(live_standings);

		this.riderControl = new RiderController({ raceManager: this.options.raceManager, container: "#focus-rider", rider: this.options.focus });
		this.team = new TeamController({ container: "#team1"});

		$(window).resize($.proxy(this.resize, this));

		//raceview.on("rider-select", $.proxy(this.onRiderSelect, this));

		this.resize();
	}

	RaceInterface.prototype = {
		resize: function () {
			var w = $(window).width(), h = window.innerHeight;

			$("body").width(w).height(h);

			var full_w = Math.min(w, h * .7);
			this.fullscreen.css({ "max-width": full_w });

			this.raceviewDOM.height("25%").width("100%");
			this.controllerDOM.height("65%").width("100%");
			this.teamDOM.height("10%").width("100%");

			this.topView.resize();
			this.riderControl.resize();
		},

		onRiderSelect: function (event, rider) {
			this.riderControl.onFieldSelectRider(rider);
		}
	};

	return RaceInterface;
});
