define(["./view", "easeljs", "preloadjs", "jquery"], function (View) {
		function TopView (options) {
			View.call(this, options);

			this.canvas = $("<canvas width=" + this.container.width() + " height = " + this.container.height() + ">");
			this.container.append(this.canvas);

			this.stage = new createjs.Stage(this.canvas[0]);

			this.zoom = options.zoom != undefined ? options.zoom : 10;
			this.focus = options.focus != undefined ? options.focus : {};

			this.raceTime = $("<p>", { class: "race-time", text: "00:00:00" } );
			this.raceTime.click($.proxy(this.onClickTime, this));
			this.container.append(this.raceTime);

			this.raceDistance = $("<p>", { class: "race-distance", text: "101.5km" } );
			this.container.append(this.raceDistance);

			this.lassoButton = new createjs.Bitmap("images/lasso-button.png");
			this.lassoButton.on("click", this.onClickLasso, this);
			this.lassoButton.cursor = "pointer";
			this.stage.addChild(this.lassoButton);

			this.leaveGroupButton = new createjs.Bitmap("images/leave-group-button.png");
			this.leaveGroupButton.on("click", this.onClickLeaveGroup, this);
			this.leaveGroupButton.cursor = "pointer";
			this.stage.addChild(this.leaveGroupButton);

			var spriteSheet = new createjs.SpriteSheet({
				images: ["images/cycle-button-sheet.png"],
				frames: { width: 50, height: 50 },
				animations: {
					on: 0,
					off: 1
				}
			});

			this.cycleButton = new createjs.Sprite(spriteSheet);
			this.cycleButton.on("click", this.onClickCycle, this);
			this.cycleButton.cursor = "pointer";
			this.stage.addChild(this.cycleButton);

			var s = new createjs.Shape();
			this.backStage = s;

			var queue = new createjs.LoadQueue();
			queue.on("complete", this.resize, this);

			queue.loadFile("images/lasso-button.png");
			queue.loadFile("images/leave-group-button.png");

			this.queue = queue;

			this.stage.on("stagemousemove", this.onMouseMove, this);
			this.stage.on("stagemousedown", this.onMouseDown, this);

			this.mouse = {};

			this.state = {};

			this.stage.addChild(s);
		}

		TopView.prototype = Object.create(View.prototype);

		$.extend(TopView.prototype, {
			getName: function () {
				return "Top View";
			},

			onClickTime: function () {
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

					container.cursor = "pointer";
					container.on("click", $.proxy(me.onClickRider, me, rider));

					me.riderStats.push({ graphic: container, color: c, rider: rider, fuelText: fuel, label: text, powerText: power, line4: line4 });
				});

				this.stage.enableMouseOver();
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

				this.backStage.graphics.clear();

				_.each(riders, function (rider, index) {
					var riderGraphic = me.riderStats[index].graphic;
					//var x = (rider.getDistance() - center_distance) / STAGE_DISTANCE * WIDTH * me.zoom;
					var x = (rider.getDistance() - center_distance) * ratio + (WIDTH * .5);

					riderGraphic.x = x;
					riderGraphic.y = rider.y ? 50 + rider.y : 75 + index * 55;

					var nick = rider.options.name.substr(0, 1).toUpperCase();
					me.riderStats[index].label.text = rider.isGroupLeader() ? nick + "*" : nick;
					me.riderStats[index].fuelText.text = Math.round(rider.getFuelPercent()) + "%";
					//me.riderStats[index].fuelText.text = Math.round(rider.getDistance() * 100) / 100;
					//me.riderStats[index].powerText.text = Math.round(rider.getCurrentSpeedInKMH()) + "km/h";
					//me.riderStats[index].fuelText.text = "desired: " + rider.extra;
					//me.riderStats[index].powerText.text = Math.round(rider.getCurrentPower()) + "W";
					me.riderStats[index].powerText.text = rider.orderInGroup;
					//me.riderStats[index].powerText.text = rider.currentGradient;
					//me.riderStats[index].powerText.text = "actual: " + Math.round(rider.getDistance() * 1000);

					//me.riderStats[index].line4.text = rider.orderInGroup + " @ " + Math.round(rider.getCurrentPower()) + "W";
					me.riderStats[index].line4.text = Math.round(rider.getCurrentPower()) + "W";
				});

				this.drawSelectedGroupOrRider();

				this.drawLasso();

				this.updateButtons();

				this.stage.update();

				this.container.find(".race-time").text(rm.getTimeElapsedAsString());
				var dist = this.rm.getStageDistance();
				var remaining = toTwoDecimalPlaces(Math.round((dist - this.focus.rider.getDistance()) * 100) / 100);
				this.container.find(".race-distance").text(remaining + " km");
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
			},

			onClickRider: function (rider, event) {
				this.container.trigger("rider-select", rider);
			},

			resize: function () {
				var w = this.container.width(), h = this.container.height();

				this.stage.canvas.width = w;
				this.stage.canvas.height = h;

				this.lassoButton.y = h - this.lassoButton.image.height;
				this.leaveGroupButton.x = this.lassoButton.image.width + 5;
				this.leaveGroupButton.y = h - this.leaveGroupButton.image.height;
				this.cycleButton.x = this.leaveGroupButton.x + this.leaveGroupButton.image.width + 5;
				this.cycleButton.y = h - this.lassoButton.image.height;
			},

			onClickLasso: function () {
				this.state.lassoActive = true;
			},

			onClickLeaveGroup: function () {
				this.options.raceManager.dropFromGroup(this.focus.rider);
			},

			onMouseMove: function (event) {
				this.mouse = { x: event.currentTarget.mouseX, y: event.currentTarget.mouseY };
			},

			onMouseDown: function () {
				if (this.state.lassoActive && this.state.selectedRider) {
					this.options.raceManager.joinWithRider(this.focus.rider, this.state.selectedRider);
				}

				this.state.lassoActive = false;
			},

			drawLasso: function () {
				if (!this.state.lassoActive) return;

				var x = this.mouse.x, y = this.mouse.y;

				var s = this.backStage;

				var riders = this.options.raceManager.getRiders();

				var thisRiderGraphic = this.getGraphicForRider(this.focus.rider);
				var x0 = thisRiderGraphic.x, y0 = thisRiderGraphic.y;
				var dx, dy;

				this.state.selectedRider = undefined;

				var min_dist = undefined;

				// check to see if we're close to a rider
				for (var i = 0; i < riders.length; i++) {
					var rider = riders[i];
					var riderGraphic = this.riderStats[i].graphic;
					if (rider != this.focus.rider) {
						if (riderGraphic) {
							dx = x - riderGraphic.x, dy = y - riderGraphic.y;
							var dist = Math.sqrt(dx * dx + dy * dy);
							if (dist < 75 || (min_dist != undefined && dist < min_dist)) {
								this.state.selectedRider = rider;
							}
						}
					}
				}


				s.graphics.setStrokeStyle(3);

				if (this.state.selectedRider) {
					s.graphics.beginStroke("yellow");
					s.graphics.moveTo(x0, y0);
					var selectedRiderGraphic = this.getGraphicForRider(this.state.selectedRider);
					var x1 = selectedRiderGraphic.x, y1 = selectedRiderGraphic.y;
					var cx = x0 + 20, cy = (y0 + y1) * .5;
					s.graphics.quadraticCurveTo(cx, cy, x1, y1);
				} else {
					s.graphics.beginStroke("green");
					s.graphics.moveTo(x0, y0);
					var x1 = this.mouse.x, y1 = this.mouse.y;
					dx = this.mouse.x - x0, dy = this.mouse.y - y0;
					var len = Math.sqrt(dx * dx + dy * dy);
					var cx, cy, angle;
					if (x1 > x0) {
						angle = -Math.atan2(dy, dx) + Math.PI * .25;
						cx = x0 - Math.cos(angle) * len * .33;
						cy = y0 - Math.sin(angle) * len * .66;
					} else {
						angle = Math.atan2(dy, dx) + Math.PI * .25;
						cx = x0 + Math.cos(angle) * len * .33;
						cy = y0 + Math.sin(angle) * len * .66;
					}
					s.graphics.quadraticCurveTo(cx, cy, x1, y1);
				}
			},

			drawSelectedGroupOrRider: function () {
				/*
				if (this.state.selectedRider) {
					var s = this.backStage;

					var graphic = this.getGraphicForRider(this.state.selectedRider);
					if (graphic) {
						var x = graphic.x, y = graphic.y;
						s.graphics.setStrokeStyle(3);
						s.graphics.beginStroke("green");
						s.graphics.drawEllipse(x, y, 20, 10);
					}
				}
				*/
			},

			getGraphicForRider: function (rider) {
				for (var i = 0; i < this.riderStats.length; i++) {
					if (this.riderStats[i].rider == rider) {
						return this.riderStats[i].graphic;
					}
				}
			},

			updateButtons: function () {
				if (this.focus.rider.isInGroup()) {
					this.leaveGroupButton.alpha = 1;
					this.leaveGroupButton.mouseEnabled = true;
				} else {
					this.leaveGroupButton.alpha = .25;
					this.leaveGroupButton.mouseEnabled = false;
				}

				if (this.focus.rider.isInGroup()) {
					this.cycleButton.alpha = 1;
					var cycling = this.focus.rider.isCooperating();
					if (cycling) {
						this.cycleButton.gotoAndStop("on");
					} else {
						this.cycleButton.gotoAndStop("off");
					}
				} else {
					this.cycleButton.alpha = .5;
				}
			},

			onClickCycle: function () {
				if (this.focus.rider.isInGroup()) {
					var cycling = this.focus.rider.isCooperating();
					this.focus.rider.setCooperating(!cycling);
				}
			}
		});

		function toTwoDecimalPlaces (num) {
			var s = num.toString();

			var period = s.indexOf(".");
			if (period == -1) {
				s += ".00";
			} else if (period >= s.length - 2) {
				s += "0";
			}

			return s;
		}

		return (TopView);
	}
);