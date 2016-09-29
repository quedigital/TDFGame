define(["easeljs", "jquery"], function () {
	function TeamController (options) {
		this.options = options;

		this.container = $("<div>", {class: "team-controller"});
		$(this.options.container).append(this.container);

		for (var i = 0; i < this.options.team.getNumRiders(); i++) {
			var rider = this.options.team.getRider(i);
			var btn = $("<button>", { class: "btn", text: rider.options.name } );
			btn.click($.proxy(this.onClickRider, this, i));
			this.container.append(btn);
		}
	}

	$.extend(TeamController.prototype, {
		getName: function () {
			return "Team Controller";
		},

		onClickRider: function (index) {
			var rider = this.options.team.getRider(index);
			this.container.trigger("select-rider", rider);
		}
	});

	return TeamController;
});
