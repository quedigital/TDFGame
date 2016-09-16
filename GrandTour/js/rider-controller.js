define(["interact", "raphael", "d3", "easeljs", "jquery"], function (interact, Raphael, d3) {
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

	function RiderController (options) {
		this.options = options;

		this.container = $("<div>", {class: "rider-controller"});
		$(this.options.container).append(this.container);

		var w = this.container.outerWidth(), h = this.container.outerHeight();
		this.width = w;
		this.height = h;

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

		// use Raphael for svg
		this.paper = Raphael(this.container[0], w, h);

		this.drawPowerController();

		this.powerKnob = this.paper.circle(50, 40, 20);
		this.powerKnob.attr("fill", "red");
		this.powerKnob.mousedown($.proxy(this.onTouchKnob, this));

		this.paper.canvas.onmousemove = $.proxy(this.onMouseMove, this);
		this.paper.canvas.onmouseup = $.proxy(this.onMouseUp, this);

		this.setPowerKnobTo(.5);

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

			this.paper.setSize(w, h);

			this.drawPowerController();

			this.powerKnob.toFront();

			this.setPowerKnobTo(.5);
		},

		drawPowerController: function () {
			var h = this.height, w = this.width;

			var pts = [50, h - 50, w - 100, h - 0, w - 50, 100]

			this.powerPath = "M" + pts[0] + "," + pts[1] + "S" + pts[2] + "," + pts[3] + "," + pts[4] + "," + pts[5];

			this.powerCurve = this.paper.path(this.powerPath);
			this.powerCurve.attr({ stroke: "blue", "stroke-width": 5 });
			this.powerCurveLength = this.powerCurve.getTotalLength();
		},

		setPowerKnobTo: function (percent) {
			var pt = this.powerCurve.getPointAtLength(this.powerCurveLength * percent);
			this.powerKnob.attr({ cx: pt.x, cy: pt. y });
		},

		onTouchKnob: function (event) {
			this.knobActive = true;
		},

		onMouseMove: function (event) {
			if (this.knobActive) {
				var pt = closestPoint(this.powerCurve, [event.offsetX, event.offsetY]);
				var percent = 0;
				if (pt[0] == undefined) {
					var start = this.powerCurve.getPointAtLength(0);
					pt[0] = start.x;
					pt[1] = start.y;
				} else {
					percent = pt.length / this.powerCurveLength;
				}

				var adjustedPercent = d3.easeQuadIn(percent);

				console.log("percent " + percent + " -> " + adjustedPercent);

				var adjustedPoint = this.powerCurve.getPointAtLength(this.powerCurveLength * adjustedPercent);

				//this.powerKnob.attr({ cx: pt[0], cy: pt[1] });
				this.powerKnob.attr({ cx: adjustedPoint.x, cy: adjustedPoint.y });
			}
		},

		onMouseUp: function (event) {
			this.knobActive = false;
		}
	});

	return RiderController;
});
