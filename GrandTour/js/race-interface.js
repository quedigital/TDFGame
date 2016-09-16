define(["top-view", "rider-controller", "team-controller"], function (TopView, RiderController, TeamController) {
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

		$("body").prepend(fullscreen);

		this.fullscreen = fullscreen;
		this.raceviewDOM = raceview;
		this.controllerDOM = controller;
		this.teamDOM = team1;

		var tv = new TopView({
			container: $("#race-view"),
			focus: {rider: this.options.focus},
			zoom: 200,
			disabled: false
		});

		this.tv = tv;

		this.options.raceManager.addView(tv);

		this.rider = new RiderController({ container: "#focus-rider", rider: this.options.focus });
		this.team = new TeamController({ container: "#team1"});

		$(window).resize($.proxy(this.resize, this));

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

			this.rider.resize();
		}
	};

	return RaceInterface;
});
