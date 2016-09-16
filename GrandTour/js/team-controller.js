define(["easeljs", "jquery"], function () {
	function TeamController (options) {
		this.options = options;

		this.container = $("<div>", {class: "team-controller"});
		$(this.options.container).append(this.container);

		for (var i = 0; i < 5; i++) {
			var btn = $("<button>", { class: "btn", text: "Rider " + (i + 1) } );
			this.container.append(btn);
		}
	}

	$.extend(TeamController.prototype, {
		getName: function () {
			return "Team Controller";
		}
	});

	return TeamController;
});
