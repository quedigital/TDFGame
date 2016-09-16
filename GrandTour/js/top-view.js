// Define the Friend model class. This extends the core Model.
define(["./view", "easeljs", "jquery"], function (View) {
		// I return an initialized object.
		function TopView (options) {
			// Call the super constructor.
			View.call(this, options);

			this.canvas = $("<canvas width=" + this.container.width() + " height = " + this.container.height() + ">");
			this.container.append(this.canvas);

			this.stage = new createjs.Stage(this.canvas[0]);

			this.zoom = options.zoom != undefined ? options.zoom : 10;
			this.focus = options.focus != undefined ? options.focus : {};

			this.canvas.click($.proxy(this.onClickTopView, this));
		}

		TopView.prototype = Object.create(View.prototype);

		$.extend(TopView.prototype, {
			getName: function () {
				return "Top View";
			},

			onClickTopView: function () {
				View.prototype.onClickView.call(this);
			},

			initialize: function (rm) {
				View.prototype.initialize.call(this, rm);

				var riders = rm.getRiders();

				this.riderStats = [];

				var me = this;

				var colors = ["red", "green", "DeepSkyBlue"];

				_.each(riders, function (rider, index) {
					var nick = rider.options.name.substr(0, 1).toUpperCase();

					var c = colors[index % colors.length];

					var container = new createjs.Container();

					var circle = new createjs.Shape();
					circle.graphics.beginFill(c).drawCircle(0, 0, 10);
					circle.x = 0;
					circle.y = 0;
					container.addChild(circle);

					var text = new createjs.Text(nick, "20px Arial", "white");
					text.textBaseline = "middle";
					text.textAlign = "center";
					container.addChild(text);

					var fuel = new createjs.Text("100%", "10px Arial", "red");
					fuel.textBaseline = "top";
					fuel.textAlign = "center";
					fuel.y = 10;
					container.addChild(fuel);

					var power = new createjs.Text("1000W", "10px Arial", "blue");
					power.textBaseline = "top";
					power.textAlign = "center";
					power.y = 20;
					container.addChild(power);

					var line4 = new createjs.Text("", "10px Arial", "black");
					line4.textBaseline = "top";
					line4.textAlign = "center";
					line4.y = 30;
					container.addChild(line4);

					me.stage.addChild(container);

					me.riderStats.push({ graphic: container, color: c, rider: rider, fuelText: fuel, label: text, powerText: power, line4: line4 });
				});
			},

			step: function (rm) {
				var riders = rm.getRiders();

				var me = this;

				var WIDTH = this.container.width();
				var STAGE_DISTANCE = rm.getStageDistance();

				var center_distance = 0;

				var ratio = (WIDTH / STAGE_DISTANCE) * this.zoom;

				if (this.focus) {
					if (this.focus.group) {
						center_distance = this.focus.group.getGroupAveragePosition();
					} else if (this.focus.rider) {
						center_distance = this.focus.rider.getDistance();
					}
				}

				_.each(riders, function (rider, index) {
					var riderGraphic = me.riderStats[index].graphic;
					//var x = (rider.getDistance() - center_distance) / STAGE_DISTANCE * WIDTH * me.zoom;
					var x = (rider.getDistance() - center_distance) * ratio + (WIDTH * .5);

					riderGraphic.x = x;
					riderGraphic.y = rider.y ? 150 + rider.y : 100 + index * 55;

					var nick = rider.options.name.substr(0, 1).toUpperCase();
					me.riderStats[index].label.text = rider.isGroupLeader() ? nick + "*" : nick;
					me.riderStats[index].fuelText.text = Math.round(rider.getFuelPercent()) + "%";
					//me.riderStats[index].fuelText.text = Math.round(rider.getDistance() * 100) / 100;
					//me.riderStats[index].powerText.text = Math.round(rider.getCurrentSpeedInKMH()) + "km/h";
					//me.riderStats[index].fuelText.text = "desired: " + rider.extra;
					//me.riderStats[index].powerText.text = Math.round(rider.getCurrentPower()) + "W";
					//me.riderStats[index].powerText.text = rider.orderInGroup + " @ " + Math.round(rider.getCurrentPower()) + "W";;
					me.riderStats[index].powerText.text = rider.currentGradient;
					//me.riderStats[index].powerText.text = "actual: " + Math.round(rider.getDistance() * 1000);

					//me.riderStats[index].line4.text = rider.orderInGroup + " @ " + Math.round(rider.getCurrentPower()) + "W";
					me.riderStats[index].line4.text = Math.round(rider.getCurrentPower()) + "W";
				});

				this.stage.update();
			},

			getColorForRider: function (rider) {
				for (var i = 0; i < this.riderStats.length; i++) {
					if (this.riderStats[i].rider == rider) {
						return this.riderStats[i].color;
					}
				}
			},

			setFocus: function (focus) {
				this.focus = focus;
			},

			setZoom: function (zoom) {
				this.zoom = zoom;
			}
		});

		// Return the base Friend constructor.
		return (TopView);
	}
);