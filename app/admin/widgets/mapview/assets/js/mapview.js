/*
 * Map View for google maps
 *
 * Data attributes:
 * - data-control="map-view" - enables google maps
 *
 * JavaScript API:
 * $('#mapDiv').mapView()
 */
+function ($) {
    "use strict";

    // MapView CLASS DEFINITION
    // ============================

    var MapView = function (element, options) {
        this.options = options
        this.$el = $(element)
        this.map = null
        this.marker = null
        this.mapShapes = {}
    }

    MapView.prototype.constructor = MapView

    MapView.DEFAULTS = {
        mapHeight: 300,
        mapZoom: 14,
        mapCenter: null,
        mapEditableShape: false,
    }

    MapView.prototype.init = function () {
        this.$mapView = this.$el.find('.map-view')
        this.$form = this.$el.closest('form')

        // Map Div must have an height
        this.$mapView.css('height', this.options.mapHeight)

        this.clearMapTimer()

        // Initialize Google Map
        this.mapTimer = window.setTimeout(this.initMap(), 300)

        this.$mapView.on('show.shape.ti.mapview', $.proxy(this.onShapeChanged, this))
        this.$mapView.on('edit.shape.ti.mapview', $.proxy(this.onShapeChanged, this))
        this.$mapView.on('changed.shape.ti.mapview', $.proxy(this.onShapeChanged, this))
    }

    MapView.prototype.dispose = function () {
        this.clearMapTimer()
        this.clearShapeTrackerTimer()
        this.options = null
        this.$el = null
        this.$mapView = null
        this.map = null
        this.marker = null
        this.mapShapes = {}
    }

    MapView.prototype.refresh = function () {
        this.init()
    }

    MapView.prototype.resize = function () {
        var allBounds, selectedShape

        if (!this.map || !Object.keys(this.mapShapes).length) {
            return;
        }

        allBounds = new google.maps.LatLngBounds()
        selectedShape = this.getSelectedShape()

        if (selectedShape) {
            var bounds = selectedShape.getBounds()
            if (bounds) allBounds.union(bounds)
        } else {
            for (var index in this.mapShapes) {
                if (this.mapShapes[index]) {
                    var bounds = this.mapShapes[index].getBounds()
                    if (bounds) allBounds.union(bounds)
                }
            }
        }

        this.map.fitBounds(allBounds);
    }

    MapView.prototype.initMap = function () {
        if (!this.options.mapCenter.lat || !this.options.mapCenter.lng) {
            alert('Map is missing center coordinates, please enter an address and click save.')
            return;
        }

        var mapCenter = new google.maps.LatLng(
            parseFloat(this.options.mapCenter.lat),
            parseFloat(this.options.mapCenter.lng)
            ),
            mapOptions = {
                zoom: this.options.mapZoom,
                center: mapCenter,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                rotateControl: true,
                streetViewControl: false,
            }

        this.map = new google.maps.Map(this.$mapView[0], mapOptions);

        this.marker = new google.maps.Marker({
            position: mapCenter,
            map: this.map
        })

        this.initShapes()
    }

    MapView.prototype.initShapes = function () {
        var self = this

        this.$el.find('[data-map-shape]').each(function () {
            var $this = $(this)
            var shapeOptions = $this.data('mapShape')
            self.createShape(shapeOptions)
        })
    }

    MapView.prototype.getShapeData = function () {
        if (!this.mapShapes)
            return

        var data = {}
        for (var shapeId in this.mapShapes) {
            if (!shapeId || !this.mapShapes[shapeId]) continue

            var innerData = {circle: {}, polygon: {}, vertices: []},
                shape = this.mapShapes[shapeId];

            var circle = shape.getMapObject('circle')

            if (circle) {
                innerData.circle = {
                    lat: circle.getCenter().lat(),
                    lng: circle.getCenter().lng(),
                    radius: circle.getRadius(),
                }
            }

            var polygon = shape.getMapObject('polygon')

            if (polygon) {
                var vertices = polygon.getPath(),
                    encodedPath = google.maps.geometry.encoding.encodePath(vertices)

                innerData.polygon = encodedPath.replace(/\\/g, ',').replace(/\//g, '-')
                for (var i = 0; i < vertices.getLength(); i++) {
                    var xy = vertices.getAt(i);
                    innerData.vertices.push({
                        lat: xy.lat(),
                        lng: xy.lng()
                    });
                }
            }

            data[shapeId] = innerData
        }

        return data
    }

    MapView.prototype.createShape = function (shapeOptions) {
        shapeOptions.editable = this.options.mapEditableShape;
        shapeOptions.options.map = this.map;
        shapeOptions.options.mapView = this.$mapView;
        this.setShape(new $.ti.mapView.shape(shapeOptions))
    }

    MapView.prototype.removeShape = function (shape) {
        var shapeObj = this.getShape(shape)

        if (!shapeObj)
            return

        var shapeIndex = shapeObj.getId()

        shapeObj.dispose()
        delete this.mapShapes[shapeIndex]
        this.resize()
    }

    MapView.prototype.setShape = function (shape) {
        var shapeId = shape.options.id
        this.mapShapes[shapeId] = shape
        this.resize()
    }

    MapView.prototype.getShape = function (shape) {
        if (!shape)
            return null

        if (typeof shape == "object")
            return shape

        if (this.mapShapes[shape])
            return this.mapShapes[shape]
    }

    MapView.prototype.getSelectedShape = function () {
        if (!Object.keys(this.mapShapes).length) {
            return;
        }

        for (var index in this.mapShapes) {
            if (this.mapShapes[index].getSelectedMapObject()) {
                return this.mapShapes[index];
            }
        }
    }

    MapView.prototype.toggleVisibleShape = function (shape) {
        var shapeObj;

        shapeObj = this.getShape(shape);

        if (!shapeObj)
            return

        shapeObj.toggleVisible()
    }

    MapView.prototype.showShape = function (shape, type) {
        var shapeObj;

        shapeObj = this.getShape(shape);
        if (!shapeObj)
            return

        shapeObj.show(type)
    }

    MapView.prototype.hideShape = function (shape, type) {
        var shapeObj;

        shapeObj = this.getShape(shape);

        if (!shapeObj)
            return

        shapeObj.hide(type)
    }

    MapView.prototype.editShape = function (shape) {
        var shapeObj;

        shapeObj = this.getShape(shape);

        if (!shapeObj)
            return

        this.clearAllEditable()
        shapeObj.edit()
        shapeObj.bringToFront()
    }

    MapView.prototype.clearEditShape = function (shape) {
        var shapeObj;

        shapeObj = this.getShape(shape);

        if (!shapeObj)
            return

        shapeObj.clearEdit()
    }

    MapView.prototype.clearAllEditable = function () {
        for (var index in this.mapShapes) {
            var shape = this.mapShapes[index];
            if (shape) shape.clearEdit()
        }
    }

    MapView.prototype.clearMapTimer = function () {
        if (this.mapTimer === null)
            return

        clearTimeout(this.mapTimer)
        this.mapTimer = null
    }

    MapView.prototype.clearShapeTrackerTimer = function () {
        if (this.shapeTrackerTimer === null)
            return

        clearTimeout(this.shapeTrackerTimer)
        this.shapeTrackerTimer = null
    }

    // EVENT HANDLERS
    // ============================

    MapView.prototype.onShapeChanged = function (event, mapObject, shape) {
        if (!mapObject)
            return

        this.clearShapeTrackerTimer()
        this.shapeTrackerTimer = window.setTimeout(this.resize(), 500)
    }

    // MapView PLUGIN DEFINITION
    // ============================

    var old = $.fn.mapView

    $.fn.mapView = function (option) {
        var args = Array.prototype.slice.call(arguments, 1), result
        this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.mapView')
            var options = $.extend({}, MapView.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('ti.mapView', (data = new MapView(this, options)))
            if (typeof option == 'string') result = data[option].apply(data, args)
            if (typeof result != 'undefined') return false
        })

        return result ? result : this
    }

    $.fn.mapView.Constructor = MapView

    // MapView NO CONFLICT
    // =================

    $.fn.mapView.noConflict = function () {
        $.fn.mapView = old
        return this
    }

    // MapView DATA-API
    // ===============
    $(document).ready(function () {
        $('[data-control="map-view"]').mapView()
    })


    // BUTTON DEFINITIONS
    // =================

    if ($.ti === undefined)
        $.ti = {}

}(window.jQuery);