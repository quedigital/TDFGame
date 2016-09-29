define(["interact", "raphael", "d3", "easeljs", "jquery"], function (interact, Raphael, d3) {
	var WAVE_RADIUS = 8;
	var SNAPPING_POINT = 250;
	var MIN_EFFORT = .01;

	var offset = 0;

	function dragMoveListener (event) {
		var target = event.target,
		// keep the dragged position in the data-x/data-y attributes
			x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
			y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

		// translate the element
		target.style.webkitTransform =
			target.style.transform =
				'translate(' + x + 'px, ' + y + 'px)';

		// update the posiion attributes
		target.setAttribute('data-x', x);
		target.setAttribute('data-y', y);
	}

	// https://gist.github.com/mbostock/8027637
	function closestPoint (pathNode, point) {
		var pathLength = pathNode.getTotalLength(),
			precision = 8,
			best,
			bestLength,
			bestDistance = Infinity;
		// linear scan for coarse approximation
		for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
			if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
				best = scan, bestLength = scanLength, bestDistance = scanDistance;
			}
		}
		// binary search for precise estimate
		precision /= 2;
		while (precision > 0.5) {
			var before,
				after,
				beforeLength,
				afterLength,
				beforeDistance,
				afterDistance;
			if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
				best = before, bestLength = beforeLength, bestDistance = beforeDistance;
			} else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
				best = after, bestLength = afterLength, bestDistance = afterDistance;
			} else {
				precision /= 2;
			}
		}
		best = [best.x, best.y];
		best.distance = Math.sqrt(bestDistance);
		best.length = bestLength;

		return best;

		function distance2(p) {
			var dx = p.x - point[0],
				dy = p.y - point[1];
			return dx * dx + dy * dy;
		}
	}

	function getEnergyWaveString (offset) {
		var s = "M0,0";
		var yy = 0;

		if (offset == undefined) offset = 0;

		for (var i = 0; i < 6 * Math.PI; i += .5) {
			var rads = i;
			var xx = i * WAVE_RADIUS * .5;
			yy = Math.sin(rads + offset * 8) * WAVE_RADIUS;
			s += "L" + Math.floor(xx) + "," + Math.floor(yy);
		}

		return s;
	}

	function convertEffortToVisualScale (effort) {
		var p = (effort - MIN_EFFORT) / (1.0 - MIN_EFFORT);

		// weight it more heavily toward the bottom of the scale
		return d3.easeCubicOut(p);
	}

	function convertLinearScaleToVisualScale (percent) {
		var p = (percent - MIN_EFFORT) / (1.0 - MIN_EFFORT);

		return p;
	}

	function convertVisualScaleToEffort (percent) {
		var reverseFunc = d3.easePolyOut.exponent(1/3);

		var p = percent;
		p = reverseFunc(p);
		p = MIN_EFFORT + (p * (1.0 - MIN_EFFORT));

		return p;
	}

	function RiderController (options) {
		this.options = options;

		this.container = $("<div>", {class: "rider-controller"});
		$(this.options.container).append(this.container);

		var w = this.container.outerWidth(), h = this.container.outerHeight();
		this.width = w;
		this.height = h;

		this.buttonStates = { up: false, down: false };

		this.knobActive = false;

		/*
		this.canvas = $("<canvas width=" + w + " height = " + h + ">");
		this.container.append(this.canvas);
		this.stage = new createjs.Stage(this.canvas[0]);

		var container = new createjs.Container();

		var circle = new createjs.Shape();
		circle.graphics.beginFill("red").drawCircle(0, 0, 10);
		circle.x = 30;
		circle.y = 40;
		container.addChild(circle);

		this.stage.addChild(container);

		this.stage.update();
		*/

		var riderName = $("<span>", { class: "rider-name", text: this.options.rider.options.name });
		this.container.append(riderName);

		// use Raphael for svg
		this.paper = Raphael(this.container[0], w, h);

		this.drawPowerController();

		$(window).on("mousemove", $.proxy(this.onMouseMove, this));
		$(window).on("mouseup", $.proxy(this.onMouseUp, this));

		this.setPowerKnobTo(.5);

		setInterval($.proxy(this.onUpdate, this), 41);

		/*
		interact('.draggable')
			.draggable({
				inertia: true,
				restrict: {
					restriction: "body",
					elementRect: {top: 0, left: 0, bottom: 1, right: 1}
				},
				onmove: dragMoveListener
			});
		*/
	}

	$.extend(RiderController.prototype, {
		getName: function () {
			return "Rider Controller";
		},

		resize: function () {
			var w = this.container.outerWidth(), h = this.container.outerHeight();
			this.width = w;
			this.height = h;

			this.powerCurve.remove();
			this.fakePowerCurve.remove();
			this.knob.remove();
			this.powerDot.remove();
			this.powerKnob.remove();
			this.arrow.remove();
			this.riderStatus.remove();
			this.upButton.remove();
			this.downButton.remove();

			this.paper.setSize(w, h);

			this.drawPowerController();

			this.powerKnob.toFront();

			this.setPowerKnobTo(.5);
		},

		setRider: function (rider) {
			this.options.rider = rider;

			this.container.find(".rider-name").text(this.options.rider.options.name);
		},

		drawPowerController: function () {
			var h = this.height, w = this.width;

			var pts = [50, h - 50, w - 100, h - 0, w - 50, 100];

			this.powerPath = "M" + pts[0] + "," + pts[1] + "S" + pts[2] + "," + pts[3] + "," + pts[4] + "," + pts[5];

			this.powerCurve = this.paper.path(this.powerPath);
			this.powerCurve.attr({ stroke: "blue", "stroke-width": 5 });
			this.powerCurveLength = this.powerCurve.getTotalLength();

			var fake_pts = [50, h - 50, w - 40, h + 10, w - 43, 0];
			var fakePowerPath = "M" + fake_pts[0] + "," + fake_pts[1] + "S" + fake_pts[2] + "," + fake_pts[3] + "," + fake_pts[4] + "," + fake_pts[5];
			this.fakePowerCurve = this.paper.path(fakePowerPath);
			this.fakePowerCurve.attr({ stroke: "none" });
			this.fakePowerCurveLength = this.fakePowerCurve.getTotalLength();

			this.knob = this.paper.circle(50, 40, 20);
			this.knob.attr({ fill: "red", stroke: "none" });
			this.knob.mousedown($.proxy(this.onTouchKnob, this));

			this.powerDot = this.paper.circle(0, 0, 3);
			this.powerDot.attr({ fill: "yellow", stroke: "none" });
			this.powerDot.hide();

			this.powerText = this.paper.text(0, 0, "400").attr({ fill: "pink ", "text-anchor": "middle", "font-size": 12, "pointer-events": "none" });

			this.powerKnob = this.paper.set();
			this.powerKnob.push(this.knob, this.powerDot, this.powerText);

			this.arrow = this.paper.image("images/arrow.png", 10, 10, 197, 150);
			this.arrow.attr( { opacity: .5 } );
			this.arrow.data( { centerX: 7, centerY: 75 } );
			this.arrow.hide();

			this.riderStatus = this.paper.image("images/rider-status.png", 10, 10, 300, 300);

			this.upButton = this.paper.image("images/up-button.png", 360, 10, 100, 51);
			this.upButton.mousedown($.proxy(this.onClickUp, this));
			this.upButton.click(this.do_upClick, this);

			this.downButton = this.paper.image("images/down-button.png", 360, 370, 100, 51);
			this.downButton.mousedown($.proxy(this.onClickDown, this));
			this.downButton.click(this.do_downClick, this);
		},

		drawEnergyPathTo: function (x, y) {
			var cx = 0, cy = 0;

			if (this.powerKnob) {
				cx = this.knob.attr("cx");
				cy = this.knob.attr("cy");
			}

			if (this.knobPoint) {
				cx += this.knobPoint.x;
				cy += this.knobPoint.y;
			}

			var dx = x - cx, dy = y - cy;
			var angle = Math.floor(Math.atan2(dy, dx) / Math.PI * 180);
			var len = Math.sqrt(dx * dx + dy * dy);

			if (len > SNAPPING_POINT) {
				this.onMouseUp();
				return;
			}

			this.updateArrowPosition(cx - this.knobPoint.x, cy - this.knobPoint.y, angle, len);

			if (this.energyPath == undefined) {
				this.energyPathString = getEnergyWaveString();
				this.energyPath = this.paper.path(this.energyPathString);
				this.glow = this.energyPath.glow( { color: "orange" } );

				var me = this;

				this.paper.customAttributes.bouncing = function (xscale, yscale) {
					var cx = this.data("cx"), cy = this.data("cy");
					var angle = this.data("angle");
					var s = "t" + cx + "," + cy + "r" + angle + ",0,0s" + xscale + "," + yscale + ",0,0";
					this.transform(s);
					me.glow.transform(s);
				};

				//this.energyPath.attr("bouncing", [0, 0]);
			}

			var xscale = len / (3 * Math.PI * WAVE_RADIUS);
			var yscale = Math.min(1, Math.max(.1, 40 / len));

			if (len > 3) {
				this.energyPath.attr({stroke: "#53D342", "stroke-width": 3 });
				this.energyPath.transform("t" + cx + "," + cy + "r" + angle + ",0,0s" + xscale + "," + yscale + ",0,0");
				//this.energyPath.transform("t" + cx + "," + cy + "r" + angle + ",0,0");
				this.energyPath.data({ cx: cx, cy: cy, angle: angle });
				this.glow.transform("t" + cx + "," + cy + "r" + angle + ",0,0s" + xscale + "," + yscale + ",0,0");
				this.energyPath.toFront();
				this.energyPath.show();
				this.glow.show();
				this.energyPath.stop();
				//this.energyPath.animate( { bouncing: [xscale, yscale] }, 1000, "elastic");
			} else {
				this.energyPath.hide();
				this.glow.hide();
			}
		},

		hideEnergyPath: function () {
			if (this.energyPath) {
				this.energyPath.hide();
				this.glow.hide();
			}
			this.powerDot.hide();
			this.arrow.hide();
		},

		setPowerKnobTo: function (percent) {
			if (percent < 0) percent = 0;
			else if (percent > 1) percent = 1;

			var pt = this.powerCurve.getPointAtLength(this.powerCurveLength * percent);
			this.powerKnob.attr({ cx: pt.x, cy: pt. y });
			this.powerText.transform("t" + pt.x + "," + pt.y);

			this.currentSetting = percent;
		},

		onTouchKnob: function (event) {
			this.knobActive = true;

			var x = event.pageX - this.container.offset().left, y = event.pageY - this.container.offset().top;
			var cx = this.knob.attr("cx"), cy = this.knob.attr("cy");
			this.knobPoint = { x: x - cx, y: y - cy };

			this.powerDot.transform("t" + this.knobPoint.x + "," + this.knobPoint.y);
			this.powerDot.toFront();
			this.powerDot.show();
		},

		onMouseMove: function (event) {
			if (this.knobActive) {
				var x0 = this.container.offset().left, y0 = this.container.offset().top;
				var px = event.pageX - x0, py = event.pageY - y0;
				px -= this.knobPoint.x;
				py -= this.knobPoint.y;

				var pt = closestPoint(this.powerCurve, [px, py]);
				var percent = 0;
				if (pt[0] == undefined) {
					var start = this.powerCurve.getPointAtLength(0);
					pt[0] = start.x;
					pt[1] = start.y;
				} else {
					percent = pt.length / this.powerCurveLength;
				}

				var fakept = closestPoint(this.fakePowerCurve, [px, py]);
				var fakepercent = 0;
				if (fakept[0] == undefined) {
					var start = this.fakePowerCurve.getPointAtLength(0);
					fakept[0] = start.x;
					fakept[1] = start.y;
				} else {
					fakepercent = fakept.length / this.fakePowerCurveLength;
				}

				var knob_percent = convertLinearScaleToVisualScale(percent);
				var knob_fakepercent = convertLinearScaleToVisualScale(fakepercent);

				var effort = undefined;

				if (percent < this.currentSetting) {
					this.setPowerKnobTo(knob_percent);
					effort = convertVisualScaleToEffort(percent);
				} else if (fakepercent > this.currentSetting) {
					this.setPowerKnobTo(knob_fakepercent);
					effort = convertVisualScaleToEffort(fakepercent);
				}

				if (effort != undefined) {
					var watts = this.options.rider.getPowerFromEffort(effort);

					this.options.rider.setEffort({power: watts});
				}

				this.drawEnergyPathTo(px + this.knobPoint.x, py + this.knobPoint.y);
			}
		},

		updateStats: function () {
			//var watts = this.options.rider.getCurrentPower();
			var watts = this.options.rider.getPowerFromEffort(this.options.rider.getEffort());
			this.powerText.attr({ text: Math.floor(watts)});
		},

		onMouseUp: function (event) {
			this.knobActive = false;

			for (var each in this.buttonStates) {
				this.buttonStates[each] = false;
			}

			this.hideEnergyPath();
		},

		onUpdate: function () {
			if (this.knobActive) {
				var s = getEnergyWaveString(offset++);
				if (this.energyPath)
					this.energyPath.attr("path", s);
			} else {
				var percent = convertEffortToVisualScale(this.options.rider.getEffort());
				this.setPowerKnobTo(percent);
			}

			if (this.buttonStates["up"]) {
				this.do_upButton();
			} else if (this.buttonStates["down"]) {
				this.do_downButton();
			}

			this.updateStats();
		},

		updateArrowPosition: function (x, y, angle, len) {
			var cx = this.arrow.data("centerX"), cy = this.arrow.data("centerY");
			var xx = x - cx;
			var yy = y - cy;
			var scaleX = len / 140, scaleY = Math.min(scaleX * .8,.3);

			this.arrow.transform("t" + xx + "," + yy + "r" + angle + "," + cx + "," + cy + "s" + scaleX + "," + scaleY + "," + cx + "," + cy);
			this.arrow.show();
		},

		onClickUp: function (event) {
			this.buttonStates["up"] = true;

			this.onUpdate();
		},

		onClickDown: function (event) {
			this.buttonStates["down"] = true;

			this.onUpdate();
		},

		do_upButton: function () {
			if (this.options.rider.isInGroup()) {
				/*
				if (this.options.rider.isGroupLeader()) {
					var power = this.options.rider.getGroup().getPowerSetting();
					this.options.rider.getGroup().setEffort({power: power + 50});
				}
				*/
			} else {
				var currentEffort = Math.min(1, this.options.rider.getEffort() + .005);
				this.options.rider.setEffort(currentEffort);
			}
		},

		do_downButton: function () {
			if (this.options.rider.isInGroup()) {
				/*
				if (this.options.rider.isGroupLeader()) {
					var power = this.options.rider.getGroup().getPowerSetting();
					this.options.rider.getGroup().setEffort({power: power - 50});
				}
				*/
			} else {
				var currentEffort = Math.max(0, this.options.rider.getEffort() - .005);
				if (currentEffort <= MIN_EFFORT) currentEffort = MIN_EFFORT;
				this.options.rider.setEffort(currentEffort);
			}
		},

		do_upClick: function () {
			if (this.options.rider.isInGroup()) {
				this.options.rider.setOrderInGroup(this.options.rider.getOrderInGroup() - 1);
			}
		},

		do_downClick: function () {
			if (this.options.rider.isInGroup()) {
				this.options.rider.setOrderInGroup(this.options.rider.getOrderInGroup() + 1);
			}
		},

		onFieldSelectRider: function (rider) {
			var group = undefined;
			if (rider.isInGroup()) {
				group = rider.getGroup();
				group.addRider(this.options.rider);
			} else {
				group = this.options.raceManager.makeGroup({ members: [rider, this.options.rider] });
			}
		}
	});

	return RiderController;
});
