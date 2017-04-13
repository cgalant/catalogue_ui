import {  Component, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import * as leaflet                                              from "leaflet";
import { Store }                                                 from "@ngrx/store";
require('leaflet.markercluster');
import { IFeed, FeedsApiService }                                from "app/commons/services/api/feedsApi.service";
import { MapUtilsService }                                       from "app/commons/services/mapUtils.service";
import { UtilsService }                                          from "app/commons/services/utils.service";
import { DatasetsActions }                                       from "app/state/datasets/datasets.actions";
import { DatasetsState }                                         from "app/state/datasets/datasets.reducer";
import { Configuration }                                         from "app/commons/configuration";
import { ProjectsApiService }                                    from "app/commons/services/api/projectsApi.service";
import { SessionService }                      from "app/commons/services/session.service";

@Component({
    selector: 'ct-feed-map',
    templateUrl: 'feed-map.html',
})
export class FeedMapComponent implements AfterViewInit {
    @Input() mapId: string;
    private _feed;
    map: leaflet.Map;
    stopsMarkers: Array<leaflet.Marker>;
    stationsMarkers: Array<leaflet.Marker>;
    initialPosition = this.config.MAP_DEFAULT_POSITION;
    _position;
    initialZoom: number = this.config.MAP_ZOOM_UNKNOWN;
    _zoom: number;
    NumberedDivIcon;
    ImageDivIcon;
    stopsMarkersClusterGroup;
    stationsMarkersClusterGroup;
    feedMarker;
    isAuthorised;

    constructor(private utils: UtilsService,
        private config: Configuration,
        private mapUtils: MapUtilsService,
        protected datasetsAction: DatasetsActions,
        private session: SessionService,
        private feedsApi: FeedsApiService,
        private store: Store<DatasetsState>,
        private sessionService: SessionService,
        private projectsApi: ProjectsApiService

    ) {
        this.stopsMarkers = new Array();
        this.stationsMarkers = new Array();
        this.NumberedDivIcon = mapUtils.createNumMarker();
        this.ImageDivIcon = mapUtils.createIconMarker();
    }

    ngAfterViewInit() {
        this.map = this.computeMap(this.mapId);
    }

    @Input() set feed(value: any) {
        this._feed = value;
        if (this.map) {
            this.populateMap();
        }
        if (this._feed && this._feed.id && this.session.loggedIn) {
            let that = this;
            this.feedsApi.getStops(this._feed.id).then(function(response) {
                that.createStops(response);
            })
        }
    }

    private createClusterGroup(stop: boolean) {
        return new (leaflet as any).MarkerClusterGroup(
            {
                //disableClusteringAtZoom: 16,
                zoomToBoundsOnClick: true,
                chunkedLoading: true,
                showCoverageOnHover: false,
                iconCreateFunction: stop ? this.mapUtils.computeStopIcon : this.mapUtils.computeStationIcon
            }
        );
    }

    private checkAuthorisations() {
        this.isAuthorised = this.utils.userHasRightsOnFeed(this.sessionService.userProfile, this._feed.projectId, this._feed.id);
    }

    protected computeMap(id): leaflet.Map {
        let tiles = leaflet.tileLayer(this.config.MAP_TILE_LAYER_URL, this.config.MAP_TILE_LAYER_OPTIONS);
        this.stopsMarkersClusterGroup = this.createClusterGroup(true);
        this.stationsMarkersClusterGroup = this.createClusterGroup(false);

        var overlayMaps = {
            '<i class="fa fa-lg fa-flag-checkered"></i> Stops': this.stopsMarkersClusterGroup,
            '<i class="fa fa-lg fa-train"></i> Stations': this.stationsMarkersClusterGroup
        };
        let options = {
            center: <any>this.initialPosition,
            zoom: 10,
            zoomControl: false,
            minZoom: 2,
            layers: [tiles]
        }
        let map = leaflet.map(id, options);
        this.stopsMarkersClusterGroup.addTo(map);
        this.stationsMarkersClusterGroup.addTo(map);
        let control = leaflet.control.layers(null, overlayMaps).addTo(map);
        control.addTo(map);
        return map;
    }

    private clearMap() {
        this.stopsMarkersClusterGroup.clearLayers();
        this.stationsMarkersClusterGroup.clearLayers();
    }

    private extractData(data) {
        if (this._feed && this.map) {
            this.clearMap();
            if (data) {
                let bounds = this.utils.computeBoundsToLatLng(this._feed.latestValidation.bounds);
                let lat = data.defaultLocationLat;
                let lng = data.defaultLocationLon;
                if (!lat)
                    lat = (bounds[0].lat + bounds[1].lat) / 2;
                if (!lng)
                    lng = (bounds[0].lng + bounds[2].lng) / 2;
                this.feedMarker = this.createMarker(this._feed, [lat, lng], bounds);
                var coord: leaflet.LatLngExpression = leaflet.latLng(lat, lng);
                this.map.setView(coord, 10);
                this.map.addLayer(this.feedMarker);
            }
        }
    }

    private populateMap() {
        let that = this;
        this.checkAuthorisations();
        if (this.isAuthorised) {
            this.projectsApi.getPrivateProject(this._feed.projectId).then(function success(data) {
                that.extractData(data);
            });
        } else {
            this.projectsApi.getPublicProject(this._feed.projectId).then(function success(data) {
                that.extractData(data);
            });
        }
    }

    private fitBounds(stop: boolean) {
        if (stop) {
            if (this.stopsMarkers.length > 0) {
                this.map.fitBounds(this.stopsMarkersClusterGroup.getBounds());
            }
        } else {
            if (this.stationsMarkers.length > 0) {
                this.map.fitBounds(this.stationsMarkersClusterGroup.getBounds());
            }
        }
    }

    protected createMarker(feed, latLng, bounds): leaflet.Marker {
        let isDraggable: boolean = this.isAuthorised;
        let marker: any = leaflet.marker(latLng, {
            title: feed.name, draggable: isDraggable,
            icon: new this.NumberedDivIcon({
                number: feed.name.charAt(0),
                surClass: feed.isPublic ? 'public' : 'private'
            })
        });
        let that = this;
        marker.on('click', function(event) {
            that.clickMarker(event);
        });
        if (isDraggable === true) {
            marker.data = {
                bounds: bounds,
                id: feed.projectId
            };
            marker.on('dragend', function(event) {
                that.updateProjectProperty(event);
            });
        }
        return marker;
    }

    // Update the Lat and Lng of the project
    private updateProjectProperty(ev) {
        var updateProject;
        var changedPos = ev.target.getLatLng();
        updateProject = {
            defaultLocationLat: changedPos.lat,
            defaultLocationLon: changedPos.lng
        };
        this.store.dispatch(this.datasetsAction.updateProject(ev.target.data.id, updateProject));
    }

    private clickMarker(event) {
        this.stopsMarkersClusterGroup.bringToFront();
        this.fitBounds(true);
    }

    private clickSSMarker(event) {

    }

    protected createStops(stops) {
        for (let i = 0; i < stops.length; i++) {
            let stop = stops[i];
            let marker: any = leaflet.marker([stop.lat, stop.lon], {
                title: stop.stopName,
                draggable: false,
                icon: new this.ImageDivIcon({
                    faIcon: (stop.locationType === 'STOP' ? 'fa-flag-checkered' : 'fa-train'),
                    surClass: (stop.locationType === 'STOP' ? 'stop-marker' : 'station-marker')
                })
            });
            var tooltip = '<b>' + stop.stopName + '</b>';
            tooltip += ('<br><b>type:</b> ' + stop.locationType);
            tooltip += stop.bikeParking ? ('<br>bikeParking: ' + stop.bikeParking) : '';
            tooltip += stop.carParking ? ('<br>carParking: ' + stop.carParking) : '';
            let that = this;
            marker.model = stop;
            marker.bindTooltip(tooltip, { direction: 'top' });
            marker.on('click', function(event) {
                that.clickSSMarker(event);
            });
            if (stop.locationType === 'STOP') {
                this.stopsMarkersClusterGroup.addLayer(marker);
                this.stopsMarkers.push(marker);
            } else {
                this.stationsMarkersClusterGroup.addLayer(marker);
                this.stationsMarkers.push(marker);
            }
        }
    }
}