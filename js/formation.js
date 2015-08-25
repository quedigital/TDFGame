define([], function () {
	function Formation (options) {
		this.options = options;
	}

	Formation.prototype.TYPE_ROADBLOCK = 1;

	Formation.prototype.turn = function () {
	};

	return Formation;
});
