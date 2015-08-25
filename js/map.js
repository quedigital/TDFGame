define(["epoly"], function () {
	function Map (options) {
		this.options = options;

		this.distanceTraveled = 0;
		this.markers = [];

		this.initialize();
		this.loadGPX();
	}

	Map.prototype.initialize = function () {
		var mapOptions = {
			center: {lat: 39.92871, lng: -86.14388},
			zoom: 50,
			disableDefaultUI: true,
			mapTypeId: google.maps.MapTypeId.ROADMAP//google.maps.MapTypeId.HYBRID
		};

		this.map = new google.maps.Map($(this.options.canvas)[0], mapOptions);
	};

	Map.prototype.loadGPX = function () {
		var me = this;

		$.ajax({
			type: "GET",
			url: this.options.gpx,
			dataType: "xml",
			success: $.proxy(this.onGPXLoaded, this)
		});
	};

	Map.prototype.onGPXLoaded = function (xml) {
		var points = [];
		elevation = [];
		var bounds = new google.maps.LatLngBounds();

		$(xml).find("trkpt").each(function () {
			var lat = $(this).attr("lat");
			var lon = $(this).attr("lon");
			var elev = parseFloat($(this).find("ele").text());
			var p = new google.maps.LatLng(lat, lon);
			points.push(p);
			elevation.push(elev);
			bounds.extend(p);
		});

		this.poly = new google.maps.Polyline({
			// use your own style here
			path: points,
			strokeColor: "#FF00AA",
			strokeOpacity: .7,
			strokeWeight: 4
		});

		/*
		 var nyc = new google.maps.LatLng(40.715, -74.002);
		 var london = new google.maps.LatLng(51.506, -0.119);
		 var distance = google.maps.geometry.spherical.computeDistanceBetween(nyc, london);
		 console.log(distance);
		 */
		var polyLengthInMeters = google.maps.geometry.spherical.computeLength(this.poly.getPath().getArray());
		console.log("distance = " + (polyLengthInMeters / 1000) + "km");
		console.log("data points = " + points.length);

		this.distance = polyLengthInMeters;

		this.poly.setMap(this.map);

		// fit bounds to track
		//map.fitBounds(bounds);

		var p = this.poly.getPath().getArray();

		this.map.setCenter(p[0]);

		if (this.options.onLoaded) {
			this.options.onLoaded();
		}
	};

	Map.prototype.addMarkerForRider = function (number, name) {
		var colors = ["red", "green", "blue", "orange", "pink", "yellow", "purple"];

		var color = number % colors.length;

		var marker = new google.maps.Marker({
			map: this.map,
			title: name,
			zIndex: this.markers.length,
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				scale: 6,
				strokeColor: colors[color]
			}
		});

		this.markers.push( { marker: marker, number: number } );
	};

	Map.prototype.getMarkerForRider = function (number) {
		for (var i = 0; i < this.markers.length; i++) {
			var m = this.markers[i];
			if (m.number == number) return m.marker;
		}
		return null;
	};

	Map.prototype.createMarker = function (point) {
		var marker = new google.maps.Marker({
			position: point,
			map: this.map,
			title: "Map Title",
			zIndex: Math.round(point.lat() * -100000) << 5
		});

		return marker;
	};

	Map.prototype.moveMarkerTo = function (distance) {
		var pt = this.poly.GetPointAtDistance(distance);

		this.marker.setPosition(pt);
	};

	Map.prototype.showRiderOnMap = function (number, distance) {
		var marker = this.getMarkerForRider(number);
		if (marker) {
			var pt = this.poly.GetPointAtDistance(distance);

			marker.setPosition(pt);
		}
	};

	Map.prototype.getGradientAtDistance = function (distance) {
		var OFFSET = 50;

		var elev1 = this.getElevationAtDistance(distance - OFFSET);
		var elev2 = this.getElevationAtDistance(distance + OFFSET);

		if (elev1 == undefined || elev2 == undefined) {
			return 0;
		} else {
			return (elev2 - elev1) / (OFFSET * 2);
		}
	};

	Map.prototype.getElevationAtDistance = function (distance) {
		var index = this.poly.GetIndexAtDistance(distance);
		if (!isNaN(index))
			return elevation[index];
		else
			return undefined;
	};

	return Map;

	function closest(llng, listData) {
		var arr = listData;
		var pnt = llng;
		var distArr = [];
		var dist = google.maps.geometry.spherical.computeDistanceBetween;

		for (index in arr)
			distArr.push([arr[index], dist(pnt, arr[index]), index]);

		return distArr.sort(function (a, b) {
			return a[1] - b[1];
		})[0];
	}
});