function initializeMap() {

  // create the map with some custom options
  // details on Leaflet API can be found here - http://leafletjs.com/reference.html
  surfaceMap = new L.Map('map', {
    crs: L.CRS.Kerbin.Equirectangular,
    center: [0,0],
    bodyControl: false,
    layersControl: false,
    scaleControl: true,
    minZoom: 0,
    maxZoom: 5,
    zoom: 2,
    maxBounds: [[-95,-190], [95,190]],
    maxBoundsViscosity: 0.5,
    closePopupOnClick: false,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 'topleft'
    },
    contextmenu: true,
    contextmenuItems: [{
      text: 'Copy Coordinates',
      callback: coordCopy
    }]
  });
  
  // define the icons for the various layer markers and events
  flagIcon = L.icon({
    iconUrl: 'button_vessel_flag.png',
    iconSize: [16, 16],
  });
  POIIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'poi.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  anomalyIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'anomaly.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  airportIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'airport.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  omniIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinOmni.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  dishIcon = L.icon({
    popupAnchor: [0, -43], 
    iconUrl: 'pinDish.png', 
    iconSize: [30, 40], 
    iconAnchor: [15, 40], 
    shadowUrl: 'markers-shadow.png', 
    shadowSize: [35, 16], 
    shadowAnchor: [10, 12]
  });
  labelIcon = L.icon({
    iconUrl: 'label.png',
    iconSize: [10, 10],
  });
  sunIcon = L.icon({
    iconUrl: 'sun.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  apIcon = L.icon({
    iconUrl: 'ap.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  peIcon = L.icon({
    iconUrl: 'pe.png',
    iconSize: [16, 16],
    iconAnchor: [8, 18],
    popupAnchor: [0, -4]
  });
  soiExitIcon = L.icon({
    iconUrl: 'soiexit.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  soiEntryIcon = L.icon({
    iconUrl: 'soientry.png',
    iconSize: [16, 12],
    iconAnchor: [9, 6]
  });
  nodeIcon = L.icon({
    iconUrl: 'node.png',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  // do not allow the user to close the map when it is in fullscreen
  surfaceMap.on('enterFullscreen', function(){
    removeMapCloseButton();
    isMapFullscreen = true;
  });
  surfaceMap.on('exitFullscreen', function(){
    if (pageType == "body") addMapCloseButton();
    isMapFullscreen = false;
  });
  
  // show controls only when the cursor is over the map
  if (!is_touch_device()) { 
    surfaceMap.on('mouseover', function(e) {
      $(".leaflet-top").fadeIn();
      $(".leaflet-bottom.leaflet-left").fadeIn();
    });
    surfaceMap.on('mouseout', function(e) {
      $(".leaflet-top").fadeOut();
      $(".leaflet-bottom.leaflet-left").fadeOut();
    });
    surfaceMap.on('mousemove', function(e) {
    
      // if we are still loading data, do not let the layer control collapse
      if (layerControl && !layerControl.options.collapsed) { layerControl._expand(); }
    });
  }
  
  // extend the measurement control to allow the user to see the position of all the points they placed
  var Ruler = L.Control.LinearMeasurement.extend({
    layerSelected: function(e) {
      var html = '<b>Selected Points:</b><p>';
      e.points.forEach(function(latlng, index) {
        if (index == 0) {
          html += latlng[0].lat + "," + latlng[0].lng + "<br>";
          html += latlng[1].lat + "," + latlng[1].lng + "<br>";
        } else {
          html += latlng[1].lat + "," + latlng[1].lng;
          if (index < e.points.length-1) html += "<br>";
        }
      });
      html += "</p>";
      e.total_label.bindPopup(L.popup().setContent(html), { offset: [45, 0] });
      e.total_label.openPopup();
    }
  });  
  surfaceMap.addControl(new Ruler({
      unitSystem: 'metric', 
      color: '#FFD800',
      show_azimut: true,
      show_last_node: true,
      contrastingColor: '#FFD800'
    }));
  
  // add a coordinates control
  L.control.mousePosition().addTo(surfaceMap);
  
  // add a scale control
  L.control.scale().addTo(surfaceMap);
  
  // no idea why but doing this makes it work better for when loading straight to the map in the body view
  setTimeout(function() {
    if (pageType != "vessel") {
      $("#map").css("height", "885px");
      surfaceMap.invalidateSize();
    }
  }, 250);
}

function loadMap(map) {
  if (!map && strCurrentBody) { loadMap(strCurrentBody.split("-")[0]); return; }
  
  // can't continue if menu data hasn't loaded. Try again in 50ms
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadMap(map);
    }, 50);
    return;
  }
 
  // if there is no current map or the map is different, continue with the load
  if (!strCurrentMap || (strCurrentMap && strCurrentMap != map)) {
    strCurrentMap = map;
    
    // add a new layer control to let ppl know data is being loaded
    if (layerControl) surfaceMap.removeControl(layerControl);
    layerControl = L.control.groupedLayers().addTo(surfaceMap);
    layerControl.addOverlay(L.layerGroup(), "<i class='fa fa-cog fa-spin'></i> Loading Data...");
    layerControl._expand();
    layerControl.options.collapsed = false;
    
    // call up the map data to load
    loadDB("loadMapData.asp?map=" + map + "&UT=" + currUT(), loadMapDataAJAX);
  }
}

function loadMapDataAJAX(xhttp) {
  console.log(xhttp);
  // could be nothing to load, so just exit
  if (xhttp.responseText == "null") return;
  
  // parse out the data
  var data = xhttp.responseText.split("^");

  // assign the map data and check for updates
  mapData = rsToObj(data[0]);
  console.log(mapData);
  if (data[1] != "null") { updatesList.push({ Type: "map", ID: strCurrentBody.split("-")[0], UT: parseFloat(data[1]) }); }
  
  // remove the previous control and load the base layer
  if (layerControl) surfaceMap.removeControl(layerControl);
  layerControl = L.control.groupedLayers().addTo(surfaceMap);
  if (mapData.Aerial) { var strSatLabel = "Aerial"; }
  if (mapData.Satellite) { var strSatLabel = "Sattelite"; }
  layerControl.addBaseLayer(
    L.tileLayer.kerbalMaps({
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "sat"
      }
    ).addTo(surfaceMap), strSatLabel);

  // show the entire control until everything is finished loading
  layerControl._expand();
  layerControl.options.collapsed = false;
  
  // load the rest of the tile layers, where available
  if (mapData.Slope) {
    var slopeBase = L.tileLayer.kerbalMaps({
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "slope"
      }
    );
    layerControl.addBaseLayer(slopeBase, "Slope");
  }
  if (mapData.Terrain) {
    var reliefBase = L.tileLayer.kerbalMaps({
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "color"
      }
    );
    layerControl.addBaseLayer(reliefBase, "Color Relief");
  }
  if (mapData.Biome) {
    var biomeBase = L.tileLayer.kerbalMaps({
        body: strCurrentBody.split("-")[0].toLowerCase(),
        style: "biome"
      }
    );
    layerControl.addBaseLayer(biomeBase, "Biome");
  }
  
  // place any and all flags
  if (mapData.Flags) {
    var flagData = mapData.Flags.split("|");
    var flagMarker;
    var layerFlags = L.layerGroup();
    flagData.forEach(function(item) {
      var flag = item.split(";");
      flagMarker = L.marker([flag[0],flag[1]], {icon: flagIcon, zIndexOffset: 100});
      flagMarker.bindPopup("<b>" + flag[3] + "</b><br />" + flag[4] + "<br />" + flag[6] + "<br />" + numeral(flag[2]/1000).format('0.000') + "km<br /><br />&quot;" + flag[5] + "&quot;<br /><br /><a target='_blank' href='" + flag[7] + "'>" + flag[8] + "</a>", {autoClose: false});
      layerFlags.addLayer(flagMarker);

      // set the ID to make the map click function ignore this popup and add it to the map
      flagMarker._myId = -1;
    });
    
    // add the layer to the map and if it is asked for in the URL variable show it immediately
    layerControl.addOverlay(layerFlags, "<img src='button_vessel_flag.png' style='width: 10px; vertical-align: 1px;'> Flags", "Ground Markers");
    if (getParameterByName("layers").includes("flag")) {
      layerFlags.addTo(surfaceMap);
    }
  }
  
  // place any and all points of interest
  if (mapData.POI) {
    var POIData = mapData.POI.split("|");
    var POIMarker;
    var layerPOI = L.layerGroup();
    POIData.forEach(function(item) {
      var POI = item.split(";");
      POIMarker = L.marker([POI[0],POI[1]], {icon: POIIcon, zIndexOffset: 100});
      strHTML = "<b>" + POI[3] + "</b><br>" + numeral(POI[2]/1000).format('0.000') + " km";
      if (POI[4] != "null") { strHTML += "<p>" + POI[4] + "</p>"; }
      POIMarker.bindPopup(strHTML, {autoClose: false});
      layerPOI.addLayer(POIMarker);
      POIMarker._myId = -1;
    });
    layerControl.addOverlay(layerPOI, "<img src='poi.png' style='width: 10px; vertical-align: 1px;'> Points of Interest", "Ground Markers");
    if (getParameterByName("layers").includes("poi") || getParameterByName("layers").includes("points of interest")) {
      layerPOI.addTo(surfaceMap);
    }
  }
  
  // place any and all anomalies
  if (mapData.Anomalies) {
    var anomalyData = mapData.Anomalies.split("|");
    var anomalyMarker;
    var layerAnomalies = L.layerGroup();
    anomalyData.forEach(function(item) {
      var anomaly = item.split(";");
      anomalyMarker = L.marker([anomaly[0],anomaly[1]], {icon: anomalyIcon, zIndexOffset: 100});
      strHTML = "<b>";
      if (anomaly[3] != "null") { strHTML += anomaly[3]; } else { strHTML += "Unknown Anomaly"; }
      strHTML += "</b><br>" + numeral(anomaly[2]/1000).format('0.000') + " km";
      anomalyMarker.bindPopup(strHTML, {autoClose: false});
      layerAnomalies.addLayer(anomalyMarker);
      anomalyMarker._myId = -1;
    });
    layerControl.addOverlay(layerAnomalies, "<img src='anomaly.png' style='width: 10px; vertical-align: 1px;'> Anomalies", "Ground Markers");
    if (getParameterByName("layers").includes("anomal")) {
      layerAnomalies.addTo(surfaceMap);
    }
  }
  
  // place any and all airports
  if (mapData.Airports) {
    var aptData = mapData.Airports.split("|");
    var aptMarker;
    var layerAirports = L.layerGroup();
    aptData.forEach(function(item) {
      var airport = item.split(";");
      aptMarker = L.marker([airport[0],airport[1]], {icon: airportIcon, zIndexOffset: 100});
      strHTML = "<b>";
      strHTML += airport[3];
      strHTML += "</b><br>Altitude: " + numeral(airport[2]/1000).format('0.000') + " km";
      aptMarker.bindPopup(strHTML, {autoClose: false});
      layerAirports.addLayer(aptMarker);
      aptMarker._myId = -1;
    });
    layerControl.addOverlay(layerAirports, "<img src='airport.png' style='width: 10px; vertical-align: 1px;'> Airports", "Ground Markers");
    if (getParameterByName("layers").includes("apt") || getParameterByName("layers").includes("airport")) {
      layerAirports.addTo(surfaceMap);
    }
  }

  // place any and all ground stations
  if (mapData.GroundStations) {
    var grndData = mapData.GroundStations.split("|");
    var grndMarker;
    var layerGrndStn = L.layerGroup();
    grndData.forEach(function(item) {
      var station = item.split(";");
      if (station[4] == "0") grndMarker = L.marker([station[0],station[1]], {icon: dishIcon, zIndexOffset: 100});
      else grndMarker = L.marker([station[0],station[1]], {icon: omniIcon, zIndexOffset: 100});
      strHTML = "<b>";
      strHTML += station[3];
      strHTML += "</b><br>Altitude: " + numeral(station[2]/1000).format('0.000') + " km";
      if (station[4] == "0") strHTML += "<br>Range: Entire Kerbin System";
      else strHTML += "<br>Range: " + numeral(station[4]/1000).format('0.000') + " km";
      grndMarker.bindPopup(strHTML, {autoClose: false});
      layerGrndStn.addLayer(grndMarker);
      grndMarker._myId = station[4];
    });
    layerControl.addOverlay(layerGrndStn, "<img src='pinGrndStation.png' style='width: 10px; vertical-align: 1px;'> Ground Stations", "Ground Markers");
    if (getParameterByName("layers").includes("ground") || getParameterByName("layers").includes("station")) {
      layerGrndStn.addTo(surfaceMap);
    }
  }

  // place any and all labels
  if (mapData.Labels) {
    var labelData = mapData.Labels.split("|");
    var labelMarker;
    var layerLabels = L.layerGroup();
    labelData.forEach(function(item) {
      var label = item.split(";");
      labelMarker = L.marker([label[0],label[1]], {icon: labelIcon, zIndexOffset: 100}).bindTooltip(label[2], {direction: 'top', offset: [0,-10]});
      layerLabels.addLayer(labelMarker);
      labelMarker._myId = -1;
      
      // zoom the map all the way in and center on this marker when clicked
      labelMarker.on('click', function(e) {
        surfaceMap.setView(e.target.getLatLng(), 5);
      });
    });
    layerControl.addOverlay(layerLabels, "<img src='label.png' style='vertical-align: 1px;'> Labels", "Ground Markers");
    if (getParameterByName("layers").includes("label")) {
      layerLabels.addTo(surfaceMap);
    }
  }

  // if this is a different map than any orbit data already loaded, dump the other data
  if (bodyPaths.bodyName && bodyPaths.bodyName != mapData.Name) {
    bodyPaths.bodyName = mapData.Name;
    // TODO - have to remove any layers that have already been created
  } else if (!bodyPaths.bodyName) bodyPaths.bodyName = mapData.Name;

  // load surface track data for any vessels and moons in orbit around this body
  // this is dependent on ops catalog data so needs to be in its own function
  loadSurfaceTracks();
  
  // the following only works for Kerbin at the moment
  if (mapData.Name == "Kerbin") {
    // determine the current position of the sun given the body's degree of initial rotation and rotational period
    var sunLon = -bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).RotIni - (((currUT() / bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).SolarDay) % 1) * 360);
    var sunLat = 0
    if (sunLon < -180) { sunLon += 360; }
    
    // place the sun marker
    sunMarker = L.marker([sunLat,sunLon], {icon: sunIcon, clickable: false});
    layerSolar.addLayer(sunMarker);
    
    // add to the layer selection control
    layerControl.addOverlay(layerSolar, "<i class='fas fa-sun' style='color: #FFD800'></i> Sun/Terminator", "Ground Markers");
    if (getParameterByName("layers").includes("sun") || getParameterByName("layers").includes("terminator")) {
      layerSolar.addTo(surfaceMap);
    }
  }

  // hide map controls after 3 seconds if the user cursor isn't over the map (or dialog) at that time
  // unless this is a touchscreen device
  if (!is_touch_device()) { 
    setTimeout(function() {
      if (!$('#map').is(":hover")) { 
        $(".leaflet-top").fadeOut();
        $(".leaflet-bottom.leaflet-left").fadeOut();
      }
    }, 3000);
  }

  // load straight to a map location?
  if (getParameterByName("center")) {
    var mapLocation = getParameterByName("center").split(",");
    surfaceMap.setView([mapLocation[0], mapLocation[1]], 3);
    if (pageType == "body") { showMap(); }
  }
  
  // load map pin(s) and caption(s)?
  if (getParameterByName("loc")) {
    var layerPins = L.featureGroup();
    var isMultiple = false;
    var pin;
    
    // get all pin locations and iterate through them
    getQueryParams("loc").forEach(function(item, index) {
      if (index > 0) isMultiple = true;
      mapLocation = item.split(",");
      if (mapLocation.length > 2) {
        pin = L.marker([mapLocation[0], mapLocation[1]]).bindPopup(mapLocation[2], {autoClose: false});
      } else {
        pin = L.marker([mapLocation[0], mapLocation[1]], {clickable: false});
      }
      layerPins.addLayer(pin);
      pin._myId = -1;
    });
    layerPins.addTo(surfaceMap);
    layerControl.addOverlay(layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
    surfaceMap.fitBounds(layerPins.getBounds());
    
    // if only one marker was placed, open its popup
    if (!isMultiple) { pin.openPopup(); }
    if (pageType == "body") { showMap(); }
  }
  
  // load flight paths, taking into account they may already be loaded
  if (getParameterByName("flt") && pageType == "body") {
    flightsToLoad = getQueryParams("flt");
    do {
      var flight = flightsToLoad.shift();
      if (!fltPaths || (fltPaths && !fltPaths.find(o => o.ID === flight))) {
        surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
        layerControl._expand();
        layerControl.options.collapsed = false;
        layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
        loadDB("loadFltData.asp?data=" + flight, loadFltDataAJAX);
        break;
      }
    } while (flightsToLoad.length);
    showMap();
  }
  
  // load straight to a map?
  // Note that &map is required ONLY when viewing a body page if you want to show the map straight away without using any other commands
  if ((window.location.href.includes("&map") || getParameterByName("layers")) && pageType == "body") { showMap(); }
  
  // done with data load?
  checkDataLoad();
}

function loadFltDataAJAX(xhttp) {
  
  // split and parse the flight data
  var fltInfo = rsToObj(xhttp.responseText.split("^")[0]);
  var fltData = [];
  xhttp.responseText.split("^")[1].split("|").forEach(function(item) { fltData.push(rsToObj(item)); });
  
  // make sure we don't overstep bounds on the color index
  if (fltPaths.length >= surfacePathColors.length) var colorIndex = fltPaths.length - (surfacePathColors.length * (Math.floor(fltPaths.length/surfacePathColors.length)));
  else var colorIndex = fltPaths.length;
  fltPaths.push({ Info: fltInfo,
                  Data: fltData,
                  Layer: L.featureGroup(),
                  Pins: [],
                  Html: null,
                  ID: xhttp.responseText.split("^")[2],
                  Deleted: false,
                  Elev: false,
                  Color: surfacePathColors[colorIndex],
                  Index: fltPaths.length
                });
  
  // make sure that if a layer is hidden the current popup is too if that belongs to the layer
  fltPaths[fltPaths.length-1].Layer._myId = fltPaths[fltPaths.length-1].Info.Title;
  fltPaths[fltPaths.length-1].Layer.on('remove', function(e) {
    if (flightPositionPopup.getContent() && flightPositionPopup.getContent().includes(e.target._myId)) surfaceMap.closePopup(flightPositionPopup);
  });

  // draw the ground track
  renderFltPath(fltPaths.length-1);
  
  // if there was only one track, make it visible and zoom in on it
  if (fltPaths.length == 1) {
    fltPaths[0].Layer.addTo(surfaceMap);
    surfaceMap.setView([fltPaths[0].Data[0].Lat, fltPaths[0].Data[0].Lng], 3);
  }
  
  // delete the loading layer and add the flight path layer to the control and the map
  console.log(surfaceTracksDataLoad)
  layerControl.removeLayer(surfaceTracksDataLoad.fltTrackDataLoad);
  layerControl.addOverlay(fltPaths[fltPaths.length-1].Layer, "<i class='fa fa-minus' style='color: " + fltPaths[fltPaths.length-1].Color + "'></i> " + fltPaths[fltPaths.length-1].Info.Title, "Flight Tracks");
  fltPaths[fltPaths.length-1].Layer.addTo(surfaceMap)
  
  // get more flight data?
  if (flightsToLoad) {
    if (flightsToLoad.length) {
      surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
      layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
      loadDB("loadFltData.asp?data=" + flightsToLoad.shift(), loadFltDataAJAX);
  
    // done with data load?
    } else {
      surfaceTracksDataLoad.fltTrackDataLoad = null;
      flightsToLoad = null;
      checkDataLoad();
      
      // if there is just one, select it in the menu
      if (fltPaths.length == 1) {
        w2ui['menu'].select(fltPaths[0].ID);
        w2ui['menu'].expandParents(fltPaths[0].ID);
        w2ui['menu'].scrollIntoView(fltPaths[0].ID);
      
      // otherwise just select and open the category
      } else {
        w2ui['menu'].select("aircraft");
        w2ui['menu'].expand("aircraft");
        w2ui['menu'].expandParents("aircraft");
        w2ui['menu'].scrollIntoView("aircraft");
      }
    }
  } else {
    surfaceTracksDataLoad.fltTrackDataLoad = null;
    checkDataLoad();
  }
  if (strFltTrackLoading) strFltTrackLoading = null;
  console.log(fltPaths)
  showMap();
}

function renderMapData() {

  // check if we need to wait for the vessel to finish loading or if we need to wait for the base map layers to finish loading
  // or if we have to wait for the GGB to finish loading or if we need to wait for the content area to stop moving
  if ((!currentVesselData && pageType == "vessel") || 
      (layerControl && !layerControl.options.collapsed) ||
      !isGGBAppletLoaded || isContentMoving) { setTimeout(renderMapData, 250); return; }

  // close the dialog in case it was left open from another vessel
  $("#mapDialog").dialog("close");

  // if there is a paused calculation we are returning to, then just resume calling the orbital batch
  if (strPausedVesselCalculation == strCurrentVessel) {
    
    // first re-show the progress dialog and reset the load state of the map
    $("#mapDialog").dialog("open");
    layerControl._expand();
    layerControl.options.collapsed = false;
    surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
    layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
    strPausedVesselCalculation = null;
    isOrbitRenderTerminated = false;
    
    // put back anything that was already rendered before the operation was paused, then continue calculations
    redrawVesselPlots();
    orbitalCalc(renderVesselOrbit, currentVesselData.Orbit);

  // otherwise we need to calculate surface tracks for a single vessel
  } else if (pageType == "vessel") {
    
    // if 3 orbits are longer than 100,000s we need to inform the user that this could take a while
    if ((currentVesselData.Orbit.OrbitalPeriod * 3) > 100000) {
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Render Single Orbit",
        click: function() { 
          numOrbitRenders = 1;
          beginOrbitalCalc();
        }
      },{
        text: "Render All Orbits",
        click: function() { 
          numOrbitRenders = 3;
          beginOrbitalCalc();
        }
      }]);
      $("#mapDialog").dialog( "option", "title", "Calculation Notice");
      $("#dialogTxt").html("Calculating 3 orbits for this vessel could take a long time, but you can also cancel at any time and show what has been done up to that point if you wish");
      $("#dialogTxt").fadeIn();
      $("#progressbar").hide();

      // gives time for any map buttons to hide
      mapDialogDelay = setTimeout(function() { 
        $("#mapDialog").dialog("open"); 
        mapDialogDelay = null;
      }, 1000);
      
    // render out the default 3 orbits for this vessel
    } else {
      numOrbitRenders = 3;
      beginOrbitalCalc();
    }
    
  // this is not a vessel with any orbital data
  } else { 
  }
}

// does the initial display and configuration for vessel orbital data loading
function beginOrbitalCalc() {
  isOrbitRenderCancelled = false;
  isOrbitRenderTerminated = false;
  currentVesselPlot = {
    Data: [],
    Events: {
      Pe: { Marker: null, UT: null },
      Ap: { Marker: null, UT: null },
      SoiEntry: { Marker: null },
      SoiExit: { Marker: null },
      Node: { Marker: null}
    },
    ID: strCurrentVessel
  };
  $("#mapDialog").dialog( "option", "title", "Calculating Orbit #1 of " + numOrbitRenders);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Cancel and Display",
    click: function() { 
      isOrbitRenderCancelled = true;
    }
  }]);
  $(".ui-progressbar-value").css("background-color", vesselOrbitColors[currentVesselPlot.Data.length]);
  $("#dialogTxt").hide();
  $("#progressbar").progressbar("value", 0);
  $("#progressbar").fadeIn();
  $("#mapDialog").dialog("open");
  layerControl._expand();
  layerControl.options.collapsed = false;
  surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
  layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  
  // set the current UT from which the orbital data will be propagated forward
  obtCalcUT = currUT();
  orbitDataCalc = [];
  orbitalCalc(renderVesselOrbit, currentVesselData.Orbit);
}

// draws the entire path of a vessel over a single or multiple orbits
function renderVesselOrbit() {
  
  // we have completed a batch of calculations, store the data
  currentVesselPlot.Data.push({
    Orbit: orbitDataCalc,
    Layer: L.featureGroup(),
    StartUT: obtCalcUT-orbitDataCalc.length
  });

  // get the times we'll reach Ap and Pe along this orbit if we haven't already done so
  if (!currentVesselPlot.Events.Ap.Marker || !currentVesselPlot.Events.Pe.Marker) {
    var n = Math.sqrt(bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).Gm/(Math.pow(Math.abs(currentVesselData.Orbit.SMA),3)));
    var newMean = toMeanAnomaly(currentVesselData.Orbit.TrueAnom, currentVesselData.Orbit.Eccentricity) + n * ((obtCalcUT-orbitDataCalc.length) - currentVesselData.Orbit.Eph);
    if (newMean < 0 || newMean > 2*Math.PI) {
      newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
    }
    var apTime = Math.round((Math.PI - newMean)/n);
    var peTime = Math.round((Math.PI*2 - newMean)/n);
    
    // close to Ap/Pe we can get a negative value, so handle that by just adding the period
    if (apTime <= 0) { apTime += Math.round(currentVesselData.Orbit.OrbitalPeriod); }
    if (peTime <= 0) { peTime += Math.round(currentVesselData.Orbit.OrbitalPeriod); }
    
    // stash away the times but convert them to UT instead of seconds from the start of this orbit
    currentVesselPlot.Events.Pe.UT = peTime + (obtCalcUT-orbitDataCalc.length);
    currentVesselPlot.Events.Ap.UT = apTime + (obtCalcUT-orbitDataCalc.length);
    
    // configure the Ap/Pe icons, ensuring that enough orbit has been plotted to display them
    if (!currentVesselPlot.Events.Ap.Marker && apTime < orbitDataCalc.length) { 

      // add the marker, assign its information popup and give it a callback for instant update when opened, then add it to the current layer
      currentVesselPlot.Events.Ap.Marker = L.marker(orbitDataCalc[apTime].Latlng, {icon: apIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + apTime);
      currentVesselPlot.Events.Ap.Marker.bindPopup("<center>Time to Apoapsis<br><span id='apTime'>" + formatTime(apTime) + "</span><br><span id='apDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", {autoClose: false});
      currentVesselPlot.Events.Ap.Marker.on('click', function(e) {
        $('#apTime').html(formatTime(currentVesselPlot.Events.Ap.UT - currUT()));
      });
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(currentVesselPlot.Events.Ap.Marker);
    }
    if (!currentVesselPlot.Events.Pe.Marker && peTime < orbitDataCalc.length) { 
      currentVesselPlot.Events.Pe.Marker = L.marker(orbitDataCalc[peTime].Latlng, {icon: peIcon}); 
      var strTimeDate = UTtoDateTime(obtCalcUT-orbitDataCalc.length + peTime);
      currentVesselPlot.Events.Pe.Marker.bindPopup("<center>Time to Periapsis<br><span id='peTime'>" + formatTime(peTime) + "</span><br><span id='peDate'>" + strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1] + "</span> UTC</center>", {autoClose: false});
      currentVesselPlot.Events.Pe.Marker.on('click', function(e) {
        $('#peTime').html(formatTime(currentVesselPlot.Events.Pe.UT - currUT()));
      });
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(currentVesselPlot.Events.Pe.Marker);
    }
  }
  
  // gather up the lat/lng positions into the paths to render
  var path = [];
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Orbit.forEach(function(position, posIndex) {
    
    // detect if we've crossed off the edge of the map and need to cut the orbital line
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.Latlng.lng < 0 && path[path.length-1].lng > 0) && Math.abs(position.Latlng.lng) > 100) || ((position.Latlng.lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.Latlng.lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(setupVesselSurfacePath(path, currentVesselPlot.Data.length-1));
      path = [];
    } 
    path.push(position.Latlng);
  });
  
  // setup the final path stretch and add it to the layer
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addLayer(setupVesselSurfacePath(path, currentVesselPlot.Data.length-1));
  
  // add the orbital layer to the control and the map
  layerControl.addOverlay(currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer, "<i class='fa fa-minus' style='color: " + vesselOrbitColors[currentVesselPlot.Data.length-1] + "'></i> Vessel Orbit #" + (currentVesselPlot.Data.length), "Orbital Tracks");
  currentVesselPlot.Data[currentVesselPlot.Data.length-1].Layer.addTo(surfaceMap)

  // delete and re-add the loading layer so it stays below the added paths
  layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
  surfaceTracksDataLoad.obtTrackDataLoad = L.layerGroup();
  layerControl.addOverlay(surfaceTracksDataLoad.obtTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");

  // go for more?
  if (numOrbitRenders > currentVesselPlot.Data.length && !isOrbitRenderCancelled) { 
    
    // update the dialog box and call another round
    $(".ui-progressbar-value").css("background-color", vesselOrbitColors[currentVesselPlot.Data.length]);
    $("#progressbar").progressbar("value", 0);
    orbitDataCalc = [];
    orbitalCalc(renderVesselOrbit, currentVesselData.Orbit); 
    
  // calculation has been completed or cancelled
  } else { 
    
    // warn the user if they cancelled the calculations early before a full orbit was rendered
    if (currentVesselPlot.Data[0].Orbit.length < currentVesselData.Orbit.OrbitalPeriod && isOrbitRenderCancelled) {
      $("#mapDialog").dialog( "option", "title", "Render Notice");
      $("#progressbar").fadeOut();
      $("#dialogTxt").fadeIn();
      $("#dialogTxt").html("You have cancelled orbital calculation prior to one full orbit. As a result, some markers (Pe, Ap, node, etc) may be missing from the plot that is rendered");
      $("#mapDialog").dialog( "option", "buttons", [{
        text: "Okay",
        click: function() { 
          $("#mapDialog").dialog("close");
        }
      }]);
    } else { $("#mapDialog").dialog("close"); }
    
    // done with the loading notice
    layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
    surfaceTracksDataLoad.obtTrackDataLoad = null;
    checkDataLoad();
    
    // reset loading flags/triggers
    strPausedVesselCalculation = null;
    isOrbitRenderCancelled = false;

    // place the craft marker and assign its popup
    vesselIcon = L.icon({iconUrl: 'button_vessel_' + w2ui['menu'].get(strCurrentVessel).img.split("-")[1] + '.png', iconSize: [16, 16]});
    vesselMarker = L.marker(currentVesselPlot.Data[0].Orbit[0].Latlng, {icon: vesselIcon, zIndexOffset: 100}).addTo(surfaceMap);
    vesselMarker.bindPopup("Lat: <span id='lat'>-000.0000&deg;S</span><br>Lng: <span id='lng'>-000.0000&deg;W</span><br>Alt: <span id='alt'>000,000.000km</span><br>Vel: <span id='vel'>000,000.000km/s</span>", {autoClose: false});

    // set up a listener for popup events so we can immediately update the information and not have to wait for the next tick event
    vesselMarker.on('popupopen', function(e) {
      var now = getPlotIndex();
      var cardinal = getLatLngCompass(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
      $('#lat').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lat).format('0.0000') + "&deg;" + cardinal.Lat);
      $('#lng').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lng).format('0.0000') + "&deg;" + cardinal.Lng);
      $('#alt').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Alt).format('0,0.000') + " km");
      $('#vel').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Vel).format('0,0.000') + " km/s");
    });
    
    // focus in on the vessel position
    console.log(currentVesselPlot);
    surfaceMap.setView(vesselMarker.getLatLng(), 3);
    
    // open the vessel popup then hide it after 5s
    vesselMarker.openPopup();
    setTimeout(function() { if (vesselMarker) vesselMarker.closePopup(); }, 5000);
    
    // allow the user to refresh the orbit render whenever they want
    addMapRefreshButton();
  }
}

function renderBodyOrbit() {
}

// this function will continually call itself to batch-run orbital calculations and not completely lock up the browser
// will calculate a full orbital period unless cancelled or otherwise interrupted by an event along the orbit, then pass control to the callback
function orbitalCalc(callback, orbit, batchCount, limit) {
  if (!batchCount) batchCount = 1000;
  if (!limit) limit = orbit.OrbitalPeriod;
  if (isOrbitRenderTerminated) return;

  // update the dialog title with the current date & time being calculated
  var strDialogTitle = "Calculating Orbit #" + (currentVesselPlot.Data.length + 1) + " of " + numOrbitRenders + " - ";
  strDialogTitle += UTtoDateTime(obtCalcUT, true);
  $("#mapDialog").dialog( "option", "title", strDialogTitle);

  // load up on some data-fetching and conversions so we're not repeating them in the batch loop
  var gmu = bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).Gm; 
  var rotPeriod = bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).RotPeriod;
  var rotInit = bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).RotIni * .017453292519943295; 
  var bodRad = bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).Radius;
  var inc = orbit.Inclination * .017453292519943295;
  var raan = orbit.RAAN * .017453292519943295;
  var arg = orbit.Arg * .017453292519943295;
  var mean = toMeanAnomaly(orbit.TrueAnom, orbit.Eccentricity);
  
  for (x=0; x<=batchCount; x++) {
  
    //////////////////////
    // computeMeanMotion()
    //////////////////////
    
    // adjust for motion since the time of this orbit
    var n = Math.sqrt(gmu/(Math.pow(Math.abs(orbit.SMA),3)));
    var newMean = mean + n * (obtCalcUT - orbit.Eph);

    ////////////////
    // solveKepler()
    ////////////////
    
    var EccA = -1;
    if (orbit.Eccentricity < 1) {
      if (newMean < 0 || newMean > 2*Math.PI) {
      
        // expanded AngleZero2Pi() function
        // abs(mod(real(Angle),2*pi));
        // javascript has a modulo operator, but it doesn't work the way we need. Or something
        // so using the mod() function implementation from Math.js: x - y * floor(x / y)
        newMean = Math.abs(newMean - (2*Math.PI) * Math.floor(newMean / (2*Math.PI)));
      }
      
      if (Math.abs(newMean - 0) < 1E-8) {
        EccA = 0;
      } else if (Math.abs(newMean - Math.PI) < 1E-8 ) {
        EccA = Math.PI;
      }	
      
      /////////////
      // keplerEq()
      /////////////
      
      // since there is no function return to break ahead of this statement, test if variable was modified
      if (EccA == -1) {
        var En  = newMean;
        var Ens = En - (En-orbit.Eccentricity*Math.sin(En) - newMean)/(1 - orbit.Eccentricity*Math.cos(En));
        while (Math.abs(Ens-En) > 1E-10) {
          En = Ens;
          Ens = En - (En - orbit.Eccentricity*Math.sin(En) - newMean)/(1 - orbit.Eccentricity*Math.cos(En));
        }
        EccA = Ens;
      }
    
    // hyperbolic orbit
    } else {
      if (Math.abs(newMean - 0) < 1E-8) {
        EccA = 0;
      } else {
        
        ////////////////
        // keplerEqHyp()
        ////////////////
        
        if (orbit.Eccentricity < 1.6) {
          if ((-Math.PI < newMean && newMean < 0) || newMean > Math.PI) {
            H = newMean - orbit.Eccentricity;
          } else {
            H = newMean + orbit.Eccentricity;
          }
        } else {
          if (orbit.Eccentricity < 3.6 && Math.abs(newMean) > Math.PI) {
            H = newMean - Math.sign(newMean) * orbit.Eccentricity;
          } else {
            H = newMean/(orbit.Eccentricity - 1);
          }
        }
        
        Hn = newMean;
        Hn1 = H;
        while (Math.abs(Hn1 - Hn) > 1E-10) {
          Hn = Hn1;
          Hn1 = Hn + (newMean - orbit.Eccentricity * Math.sinh(Hn) + Hn) / (orbit.Eccentricity * Math.cosh(Hn) - 1);
        }
        
        EccA = Hn1;
      }
    }
    
    ///////////////////////////////
    // computeTrueAnomFromEccAnom()
    // computeTrueAnomFromHypAnom()
    ///////////////////////////////
    
    if (orbit.Eccentricity < 1) {
      // (1+orbit.Eccentricity) or (orbit.Eccentricity+1) ???
      var upper = Math.sqrt(1+orbit.Eccentricity) * Math.tan(EccA/2);
      var lower = Math.sqrt(1-orbit.Eccentricity);
     
      // expanded AngleZero2Pi() function
      // abs(mod(real(Angle),2*pi));
      // javascript has a modulo operator, but it doesn't work the way we need. Or something
      // so using the mod() function implementation from Math.js: x - y * floor(x / y)
      var tru = Math.abs((Math.atan2(upper, lower) * 2) - (2*Math.PI) * Math.floor((Math.atan2(upper, lower) * 2) / (2*Math.PI)));
    } else {
      var upper = Math.sqrt(orbit.Eccentricity+1) * Math.tanh(EccA/2);
      var lower = Math.sqrt(orbit.Eccentricity-1);
      var tru = Math.atan2(upper, lower) * 2;
    }
    
    ///////////////////////////
    // getStatefromKepler_Alg()
    ///////////////////////////
    
    // Special Case: Circular Equitorial
    if(orbit.Eccentricity < 1E-10 && (inc < 1E-10 || Math.abs(inc-Math.PI) < 1E-10)) {
      var l = raan + arg + tru;
      tru = l;
      raan = 0;
      arg = 0;
    }

    // Special Case: Circular Inclined
    if(orbit.Eccentricity < 1E-10 && inc >= 1E-10 && Math.abs(inc-Math.PI) >= 1E-10) {
      var u = arg + tru;
      tru = u;
      arg = 0.0;
    }

    // Special Case: Elliptical Equitorial
    if(orbit.Eccentricity >= 1E-10 && (inc < 1E-10 || Math.abs(inc-Math.PI) < 1E-10)) {
      raan = 0;
    }

    var p = orbit.SMA*(1-(Math.pow(orbit.Eccentricity,2)));
    
    // vector/matrix operations handled by Sylvester - http://sylvester.jcoglan.com/
    var rPQW = $V([p*Math.cos(tru) / (1 + orbit.Eccentricity*Math.cos(tru)),
                   p*Math.sin(tru) / (1 + orbit.Eccentricity*Math.cos(tru)),
                   0]);
    var vPQW = $V([-Math.sqrt(gmu/p)*Math.sin(tru),
                   Math.sqrt(gmu/p)*(orbit.Eccentricity + Math.cos(tru)),
                   0]);
    var TransMatrix = $M([
      [Math.cos(raan)*Math.cos(arg)-Math.sin(raan)*Math.sin(arg)*Math.cos(inc), -Math.cos(raan)*Math.sin(arg)-Math.sin(raan)*Math.cos(arg)*Math.cos(inc), Math.sin(raan)*Math.sin(inc)],
      [Math.sin(raan)*Math.cos(arg)+Math.cos(raan)*Math.sin(arg)*Math.cos(inc), -Math.sin(raan)*Math.sin(arg)+Math.cos(raan)*Math.cos(arg)*Math.cos(inc), -Math.cos(raan)*Math.sin(inc)],
      [Math.sin(arg)*Math.sin(inc), Math.cos(arg)*Math.sin(inc), Math.cos(inc)]
    ]);

    var rVect = TransMatrix.multiply(rPQW);
    var vVect = TransMatrix.multiply(vPQW);	

    /////////////////////
    // getBodySpinAngle()
    /////////////////////
    
    var bodySpinRate = 2*Math.PI/rotPeriod;
    
    // expanded AngleZero2Pi() function
    // abs(mod(real(Angle),2*pi));
    // javascript has a modulo operator, but it doesn't work the way we need. Or something
    // so using the mod() function implementation from Math.js: x - y * floor(x / y)
    var angle = rotInit + bodySpinRate*obtCalcUT;
    var spinAngle = Math.abs(angle - (2*Math.PI) * Math.floor(angle / (2*Math.PI)));

    //////////////////////////////////////
    // getFixedFrameVectFromInertialVect()
    //////////////////////////////////////

    var R = $M([
      [Math.cos(spinAngle), -Math.sin(spinAngle), 0],
      [Math.sin(spinAngle), Math.cos(spinAngle), 0],
      [0, 0, 1]
    ]);

    R = R.transpose();
    var rVectECEF = R.multiply(rVect);

    //////////////////////////////////
    // getLatLongAltFromInertialVect()
    //////////////////////////////////

    // 2-norm or Euclidean norm of vector
    var rNorm = Math.sqrt(rVectECEF.e(1) * rVectECEF.e(1) + rVectECEF.e(2) * rVectECEF.e(2) + rVectECEF.e(3) * rVectECEF.e(3));

    // convert to degrees from radians - angle / Math.PI * 180
    // expanded AngleZero2Pi() function
    // abs(mod(real(Angle),2*pi));
    // javascript has a modulo operator, but it doesn't work the way we need. Or something
    // so using the mod() function implementation from Math.js: x - y * floor(x / y)
    var longitude = (Math.abs(Math.atan2(rVectECEF.e(2),rVectECEF.e(1)) - (2*Math.PI) * Math.floor(Math.atan2(rVectECEF.e(2),rVectECEF.e(1)) / (2*Math.PI)))) * 57.29577951308232;
    var latitude = (Math.PI/2 - Math.acos(rVectECEF.e(3)/rNorm)) * 57.29577951308232;
    var alt = rNorm - bodRad;
    var vel = Math.sqrt(gmu*(2/rNorm - 1/orbit.SMA));
    
    // convert the lng to proper coordinates (-180 to 180)
    if (longitude >= 180) { longitude -= 360; }
    
    // store all the derived values and advance to the next second
    orbitDataCalc.push({Latlng: {lat: latitude, lng: longitude}, Alt: alt, Vel: vel});
    obtCalcUT++;
    
    // update the progress bar - will only show if loading data for a single vessel
    $('#progressbar').progressbar("value", (orbitDataCalc.length/limit)*100);
    
    // exit the batch prematurely if we've reached the end of the calculation period
    if (orbitDataCalc.length >= limit) { break; }
  }
  
  // let the callback know if we've completed all orbital calculations, or cancel out if requested by the user
  if (orbitDataCalc.length >= limit || isOrbitRenderCancelled) {
    callback(); 
    
  // just exit and don't call anything if the calculations have been paused by switching away from the vessel
  } else if (strPausedVesselCalculation) {
    return;
    
  // otherwise call ourselves again for more calculations, with a small timeout to let other things happen
  } else {       
    setTimeout(orbitalCalc, 1, callback, orbit, batchCount);
  }
}

function addMapResizeButton() {
  if (!mapResizeButton) {
    mapResizeButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-arrow-up',
        title: 'Enlarge map view',
        onClick: function(control) {
          raiseContent();
          $("#infoDialog").dialog("close")
          control.state('lower');
        }
      }, {
        stateName: 'lower',
        icon: 'fa-arrow-down',
        title: 'Reduce map view',
        onClick: function(control) {
          lowerContent();
          control.state('raise');
        }
      }]
    }).addTo(surfaceMap);
  }
}
function addMapViewButton() {
  if (!mapViewButton) {
    mapViewButton = L.easyButton({
      states: [{
        stateName: 'global',
        icon: 'fa-globe',
        title: 'View all orbits for this body',
        onClick: function(control) {
          swapContent("body", strCurrentBody);
          setTimeout(showMap, 1000);
        }
      }, {
        stateName: 'vessel',
        icon: 'fa-rocket',
        title: 'View vessel orbit',
        onClick: function(control) {
          swapMapView("vessel");
          control.state('global');
        }
      }]
    }).addTo(surfaceMap);
  }
}
function removeMapResizeButton() {
  if (mapResizeButton) {
    surfaceMap.removeControl(mapResizeButton);
    mapResizeButton = null;
  }
}
function removeMapViewButton() {
  if (mapViewButton) {
    surfaceMap.removeControl(mapViewButton);
    mapViewButton = null;
  }
}
function removeVesselMapButtons() {
  removeMapResizeButton();
  removeMapViewButton();
}

// these buttons will go on both vessel and body maps
function addMapRefreshButton() {
  if (!mapRefreshButton) {
    mapRefreshButton = L.easyButton({
      states: [{
        stateName: 'refresh',
        icon: 'fa-undo',
        title: 'Reload all orbits',
        onClick: function(control) {
          if (pageType == "vessel") { clearVesselPlots(); }
          renderMapData();
        }
      }]
    }).addTo(surfaceMap);
  }
}
function removeMapRefreshButton() {
  if (mapRefreshButton) {
    surfaceMap.removeControl(mapRefreshButton);
    mapRefreshButton = null;
  }
}
function addMapCloseButton() {
  if (!mapCloseButton) {
    mapCloseButton = L.easyButton({
      states: [{
        stateName: 'raise',
        icon: 'fa-times',
        title: 'Close map view',
        onClick: function(control) { hideMap(); }
      }]
    }).addTo(surfaceMap);
  }
}
function removeMapCloseButton() {
  if (mapCloseButton) {
    surfaceMap.removeControl(mapCloseButton);
    mapCloseButton = null;
  }
}

function showMap() {
  if (!isMapShown) {
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
    $("#map").css("visibility", "visible");
    $("#map").fadeIn();
    removeVesselMapButtons();
    removeMapRefreshButton();
    addMapCloseButton();
    redrawFlightPlots();
    $("#contentHeader").html(strCurrentBody.split("-")[0]);
    document.title = "KSA Operations Tracker - " + strCurrentBody.split("-")[0];
    if (launchsiteMarker) surfaceMap.removeLayer(launchsiteMarker);
    surfaceMap.invalidateSize();
    isMapShown = true;
  }
}

function hideMap() {
  if (isMapShown) {
    if ($("#map").css("visibility") != "hidden") $("#map").fadeOut();
    if (!isGGBAppletLoading) {
      $("#figureOptions").fadeIn();
      $("#vesselOrbitTypes").fadeIn();
      $("#figure").fadeIn();
      $("#contentHeader").html(strCurrentBody.replace("-", " "));
      document.title = "KSA Operations Tracker - " + strCurrentBody.replace("-", " ");
    }
    isMapShown = false;
  }
}

// because the vessel plot is broken up into distinct orbital periods, we need to do a bit of legwork
// to determine what index of what plot corresponds to the given UT
function getPlotIndex(targetUT) {
  if (!targetUT) targetUT = currUT();
  
  // check that this UT is even feasible by seeing if it is greater than the last UT of this orbit
  var lastIndex = currentVesselPlot.Data.length-1;
  if (currentVesselPlot.Data[lastIndex].StartUT + currentVesselPlot.Data[lastIndex].Orbit.length < targetUT) { return null; }

  // get the total amount of seconds that have transpired since the start of the orbital plot
  var totalTime = targetUT - currentVesselPlot.Data[0].StartUT;
  
  // now determine what orbit this puts us in by comparing the elapsed time to the length of the orbit and cutting down until we find a lesser amount
  // note we are not just using the current vessel orbital period because this instead takes into account the orbital calc being cancelled early
  var currentOrbit = 0;
  for (; currentOrbit<currentVesselPlot.Data.length; currentOrbit++) {
    if (totalTime > currentVesselPlot.Data[currentOrbit].Orbit.length) { totalTime -= currentVesselPlot.Data[currentOrbit].Orbit.length; }
    else { break; }
  }
  
  // the time remaining is our current index
  return {ObtNum: currentOrbit, Index: totalTime};
}

// finds out which orbital data point most closely corresponds to the map location targeted by the cursor by
// traversing the orbit's position array and getting the difference between the current index and the location clicked
// if it is smaller than the margin, stop. If the entire orbit is searched, increase the margin and try again
function getDataPoint(obtNum, target) {
  var index = 0;
  var margin = 0.1;
  
  while (true) {
    if (Math.abs(currentVesselPlot.Data[obtNum].Orbit[index].Latlng.lat - target.lat) < margin && Math.abs(currentVesselPlot.Data[obtNum].Orbit[index].Latlng.lng - target.lng) < margin) { break; }
    index++;
    if (index >= currentVesselPlot.Data[obtNum].Orbit.length) {
      index = 0;
      margin += 0.1;
    }
  }

  return index;
}

// take care of all the details that need to be applied to a flight's surface track as this needs to be done in two separate places
function setupFlightSurfacePath(path, index, startIndex, length) {
  
  // we are rendering a hotline showing elevation changes
  if (fltPaths[index].Elev) {
    var srfTrack = L.hotline(path, {
      smoothFactor: 1.75, 
      clickable: true, 
      weight: 3, 
      outlineWidth: 1,
      min: 0,
      max: 8,
      palette: {
        0.0: '#267F00',
        0.125: '#00FF21',
        0.25: '#0094FF',
        0.375: '#00FFFF',
        0.5: '#FFD800',
        0.625: '#FF6A00',
        0.75: '#FF0000',
        0.875: '#808080',
        1.0: '#000000'
      }
    });
  } 
  
  // we are rendering a normal line
  else {
    var srfTrack = L.polyline(path, {
      smoothFactor: 1.75, 
      clickable: true, 
      color: fltPaths[index].Color, 
      weight: 3, 
      opacity: 1
    });
  }

  // save the beginning index of this line to make it faster when searching for a data point by not having to look through the whole array
  // also save the current flight index to identify the data needed for the popups
  // also also save the length of the path
  srfTrack._myId = startIndex + "," + index + "," + length;
  
  // show the time and data for this position
  srfTrack.on('mouseover mousemove', function(e) {
    if (!flightPositionPopup.isOpen()) {
      var idStr = e.target._myId.split(",");
      var index = parseInt(idStr[0]);
      var indexFlt = parseInt(idStr[1]);
      var margin = 0.1;
      
      // traverse the latlon array and get the diff between the current index and the location hovered
      // if it is smaller than the margin, stop. If the entire path is searched, increase the margin and try again
      while (true) {
        if (Math.abs(fltPaths[indexFlt].Data[index].Lat - e.latlng.lat) < margin && Math.abs(fltPaths[indexFlt].Data[index].Lng - e.latlng.lng) < margin) { break; }
        index++;
        
        // be sure to account for running to the end of the current path or end of array
        if (index - parseInt(idStr[1]) >= parseInt(idStr[2]) || index >= fltPaths[indexFlt].Data.length) {
          index = parseInt(idStr[0]);
          margin += 0.1;
        }
      }
      currentFlightTimelineIndex = index;

      // compose the popup HTML and place it on the cursor location then display it
      var cardinal = getLatLngCompass({lat: fltPaths[indexFlt].Data[index].Lat, lng: fltPaths[indexFlt].Data[index].Lng});
      if (timePopup) { surfaceMap.closePopup(timePopup); }
      timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      timePopup.setLatLng(e.latlng);
      timePopup.setContent(UTtoDateTime(fltPaths[indexFlt].Data[index].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[indexFlt].Data[index].Lat).format('0.0000') + '&deg;' + cardinal.Lat + '<br>Longitude: ' + numeral(fltPaths[indexFlt].Data[index].Lng).format('0.0000') + '&deg;' + cardinal.Lng + '<br>Altitude ASL: ' + numeral(fltPaths[indexFlt].Data[index].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[indexFlt].Data[index].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[indexFlt].Data[index].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[indexFlt].Data[index].Dist/1000).format('0,0.000') + " km<p>Click for additional options</p>");
      timePopup.openOn(surfaceMap);
    }
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) { surfaceMap.closePopup(timePopup); }
    timePopup = null;
  });
  
  // when clicking along this line, display the mission data info
  srfTrack.on('click', function(e) {
    if (!flightPositionPopup.isOpen()) {
      var indexFlt = parseInt(e.target._myId.split(",")[1]);
      w2ui['menu'].select(fltPaths[indexFlt].ID);
      w2ui['menu'].expandParents(fltPaths[indexFlt].ID);
      w2ui['menu'].scrollIntoView(fltPaths[indexFlt].ID);

      // fill, position and display the popup
      var strNewHtml = "<span id='fltTimelineData'>";
      strNewHtml += timePopup.getContent().replace("<p>Click for additional options</p>", "");
      strNewHtml += "</span><p><center><button id='prevFltData' onclick='prevFltData()' class='flightTimelineButton'>&lt;&lt;</button> <button id='prevFltDataOnce' onclick='prevFltDataOnce()' class='flightTimelineButton'>&lt;</button> <b>Timeline Controls</b><sup><a href='https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#timeline-playback' target='_blank' style='text-decoration: none'>(?)</a></sup> <button id='nextFltDataOnce' onclick='nextFltDataOnce()' class='flightTimelineButton'>&gt;</button> <button id='nextFltData' onclick='nextFltData()' class='flightTimelineButton'>&gt;&gt;</button>";
      strNewHtml += "<br><span class='fauxLink' onclick='missionInfoDlg(" + indexFlt + ")'>Mission Info</span> | ";
      strNewHtml += "<span class='fauxLink' onclick='removeFltPath(" + indexFlt + ")'>Remove Track</span> | <span class='fauxLink' onclick='fltElev(" + indexFlt + ")'>";
      if (fltPaths[index].Elev) {
        strNewHtml += "Hide Data";
      } else {
        strNewHtml += "Show Data";
      }
      strNewHtml += "</span></center></p>";
      flightPositionPopup.setContent(strNewHtml);
      flightPositionPopup.setLatLng(e.latlng);
      flightPositionPopup.openOn(surfaceMap);
      surfaceMap.setView(e.latlng);
      surfaceMap.closePopup(timePopup);
      timePopup = null;

      // save the index for later
      currentFlightIndex = indexFlt;
    }
  });
  
  return srfTrack;
}

// take care of all the details that need to be applied to a vessel's surface track as this needs to be done in two separate places
function setupVesselSurfacePath(path, obtIndex) {
  var srfTrack = L.polyline(path, {smoothFactor: 1.25, clickable: true, color: vesselOrbitColors[obtIndex], weight: 3, opacity: 1});
  
  // save the orbit index of this line to make it faster when searching for a data point by not having to look at all 3 orbits
  srfTrack._myId = obtIndex;
  
  // show the time and orbit for this position
  // ignore this when the map is downsized because for some reason the coordinates are off
  srfTrack.on('mouseover mousemove', function(e) {
    if ($("#map").css("height") != "480px") {
      if (timePopup) { surfaceMap.closePopup(timePopup); }
      timePopup = new L.Rrose({ offset: new L.Point(0,-1), closeButton: false, autoPan: false });
      timePopup.setLatLng(e.latlng);
      var strTimeDate = UTtoDateTime(currentVesselPlot.Data[e.target._myId].StartUT + getDataPoint(e.target._myId, e.latlng));
      timePopup.setContent("<center>Orbit #" + (e.target._myId+1) + "<br>" + strTimeDate.split("@")[0] + "<br>" + strTimeDate.split("@")[1] + " UTC</center>");
      timePopup.openOn(surfaceMap);
    }
  });
  
  // remove the mouseover popup
  srfTrack.on('mouseout', function(e) {
    if (timePopup) { surfaceMap.closePopup(timePopup); }
    timePopup = null;
  });
  
  // when clicking along this line, find the nearest data point to display for the user
  // ignore this when the map is downsized because for some reason the coordinates are off
  srfTrack.on('click', function(e) {
    if ($("#map").css("height") != "480px") {
      surfaceMap.closePopup(timePopup);
      timePopup = null;
      var index = getDataPoint(e.target._myId, e.latlng);
      var cardinal = getLatLngCompass(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng);
        
      // compose the popup HTML and place it on the cursor location then display it
      vesselPositionPopup.setLatLng(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng);
      vesselPositionPopup.setContent(UTtoDateTime(currentVesselPlot.Data[e.target._myId].StartUT + index) + ' UTC<br>Latitude: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng.lat).format('0.0000') + '&deg;' + cardinal.Lat + '<br>Longitude: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Latlng.lng).format('0.0000') + '&deg;' + cardinal.Lng + '<br>Altitude: ' + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Alt).format('0,0.000') + " km<br>Velocity: " + numeral(currentVesselPlot.Data[e.target._myId].Orbit[index].Vel).format('0,0.000') + " km/s");
      vesselPositionPopup.openOn(surfaceMap);
    }
  });
  
  return srfTrack;
}

// decides which compass quadrant the current coordinates reside in
function getLatLngCompass(latlng) {
  if (latlng.lat < 0) {
    var cardinalLat = "S";
  } else {
    var cardinalLat = "N";
  }
  if (latlng.lng < 0) {
    cardinalLng = "W";
  } else {
    cardinalLng = "E";
  }
  return {Lat: cardinalLat, Lng: cardinalLng};
}

// removes all ground plots from the map along with any associated markers
function clearSurfacePlots() {
  if (currentVesselPlot) {
    currentVesselPlot.Data.forEach(function(item) { 
      if (item.Layer) {
        layerControl.removeLayer(item.Layer); 
        surfaceMap.removeLayer(item.Layer);
      }
    });
    for (var event in currentVesselPlot.Events) {
      if (event.Marker) surfaceMap.removeLayer(event.Marker);
    }
    if (vesselMarker) { 
      surfaceMap.removeLayer(vesselMarker);
    }
  }
  if (fltPaths.length) {
    fltPaths.forEach(function(path) {
      layerControl.removeLayer(path.Layer); 
      surfaceMap.removeLayer(path.Layer);
      
      path.Pins.forEach(function(pin) {
        pin.Group.forEach(function(marker) {
          if (marker.Pin) surfaceMap.removeLayer(marker.Pin);
        });
      });
    });
  }
  removeMapRefreshButton();
}

// puts an existing plot of vessel orbits back onto the map
function redrawVesselPlots() {
  currentVesselPlot.Data.forEach(function(item, index) { 
    layerControl.addOverlay(item.Layer, "<i class='fa fa-minus' style='color: " + vesselOrbitColors[index] + "'></i> Vessel Orbit #" + (index+1), "Orbital Tracks");
    item.Layer.addTo(surfaceMap);
  });
  for (var event in currentVesselPlot.Events) {
    if (event.Marker) {
      event.Marker.addTo(surfaceMap);
      
      // figure out which layer to add this to, if we can
      var index = getPlotIndex(event.UT);
      if (index) {
        currentVesselPlot.Data[index.ObtNum].Layer.addLayer(event.Marker);
      }
    }
  }
  if (vesselMarker) {
    vesselMarker.addTo(surfaceMap);
    
    // open the vessel popup then hide it after 5s
    surfaceMap.setView(vesselMarker.getLatLng(), 3); 
    vesselMarker.openPopup();
    setTimeout(function() { vesselMarker.closePopup(); }, 5000);
  }
  addMapRefreshButton();
  surfaceMap.invalidateSize();
}

// puts any existing plots of flights back onto the map
function redrawFlightPlots() {
  if (fltPaths.length) {
    fltPaths.forEach(function(path, index) {
      if (index >= surfacePathColors.length) var colorIndex = index - (surfacePathColors.length * (Math.floor(index/surfacePathColors.length)));
      else var colorIndex = index;
      layerControl.addOverlay(path.Layer, "<i class='fa fa-minus' style='color: " + surfacePathColors[colorIndex] + "'></i> " + path.Info.Title, "Flight Tracks");
      path.Layer.addTo(surfaceMap)
    });
  }
}

// ensures the layer control does not collapse until all data is loaded
// checks data object and if anything is not nulled out it skips the rest of the function, which would end the loading
function checkDataLoad() {
  Object.entries(surfaceTracksDataLoad).forEach(function(items) {
    if (items[1]) return;
  });
  layerControl._collapse();
  layerControl.options.collapsed = true;
}

// places a pin or group of pins when a link is clicked in a flight path mission data window
function popupMarkerOpen(indexFlt, linkNum) {
  surfaceMap.closePopup(flightPositionPopup);

  for (pinIndex=0; pinIndex<fltPaths[indexFlt].Pins[linkNum].Group.length; pinIndex++) {
  
    // don't create this pin if it is already created
    if (!fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin) {
      fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin = L.marker([fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Lat, fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Lng]).bindPopup(decodeURI(fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].HTML, {autoClose: false}) + "<p><center><span onclick='popupMarkerClose(" + indexFlt + "," + linkNum + "," + pinIndex + ")' style='color: blue; cursor: pointer;'>Remove Pin</span></center></p>", {closeButton: true}).addTo(surfaceMap);
      fltPaths[indexFlt].Layer.addLayer(fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin);
      
      // if there is just one pin, open the popup
      if (fltPaths[indexFlt].Pins[linkNum].Group.length == 1) { fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin.openPopup(); }
      
    // if the pin is already created, open the popup
    } else {
      fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin.openPopup();
    }
  }
}

// removes a single pin when user clicks link in pin popup
function popupMarkerClose(indexFlt, linkNum, pinIndex) {
  fltPaths[indexFlt].Layer.removeLayer(fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin);
  fltPaths[indexFlt].Pins[linkNum].Group[pinIndex].Pin = null;
}

// removes a single flight path, but doesn't actually delete it in case the request for it is made again
function removeFltPath(index) {
  if (flightPositionPopup.isOpen()) surfaceMap.closePopup(flightPositionPopup);
  layerControl.removeLayer(fltPaths[index].Layer);
  surfaceMap.removeLayer(fltPaths[index].Layer);

  fltPaths[index].Pins.forEach(function(pin) {
    pin.Group.forEach(function(marker) {
      if (marker.Pin) surfaceMap.removeLayer(marker.Pin);
    });
  });
  fltPaths[index].Deleted = true;
}

// copies the current location of the mouse cursor to the clipboard
// https://stackoverflow.com/questions/33855641/copy-output-of-a-javascript-variable-to-the-clipboard
function coordCopy(context) {

  // Create a dummy input to copy the variable inside it
  var dummy = document.createElement("input");

  // Add it to the document
  document.body.appendChild(dummy);

  // Set its ID
  dummy.setAttribute("id", "dummy_id");

  // Output the array into it
  document.getElementById("dummy_id").value=context.latlng.lat + "," + context.latlng.lng;

  // Select it
  dummy.select();

  // Copy its contents
  document.execCommand("copy");

  // Remove it as its not needed anymore
  document.body.removeChild(dummy);
}

// display or hide a flight path with the line colored to show elevation changes
function fltElev(index) {

  // cancel any timeline playing since we have to destroy and redraw the line
  if (flightTimelineInterval) clearInterval(flightTimelineInterval);

  // there can only be one, so if another path is showing elevation data, return it to normal
  var elevPath = fltPaths.find(o => o.Elev === true);
  if (elevPath && elevPath.Index != index) fltElev(elevPath.Index);

  // toggle the state of our elevation display
  fltPaths[index].Elev = !fltPaths[index].Elev;

  // remove the current path and reset for a new one
  removeFltPath(index);
  fltPaths[index].Deleted = false;
  fltPaths[index].Layer = L.featureGroup();

  // redraw the flight path and add it back to the layer control
  // the icon used depends on whether elevation is shown or not
  renderFltPath(index);
  if (fltPaths[index].Elev) {
    layerControl.addOverlay(fltPaths[index].Layer, "<i class='far fa-chart-bar'></i>" + fltPaths[index].Info.Title, "Flight Tracks");
  } else {
    layerControl.addOverlay(fltPaths[index].Layer, "<i class='fa fa-minus' style='color: " + fltPaths[index].Color + "'></i> " + fltPaths[index].Info.Title, "Flight Tracks");
  }
  fltPaths[index].Layer.addTo(surfaceMap)
}

// plots out the various lat,lng points onto the surface map
function renderFltPath(pathIndex) {
  var path = [];
  var startIndex = 0;
  fltPaths[pathIndex].Data.forEach(function(position, index) {
  
    // detect if we've crossed off the edge of the map and need to cut the path
    // compare this lng to the prev and if it changed from negative to positive or vice versa, we hit the edge  
    // (check if the lng is over 100 to prevent detecting a sign change while crossing the meridian)
    if (path.length && (((position.Lng < 0 && path[path.length-1].Lng > 0) && Math.abs(position.Lng) > 100) || ((position.Lng > 0 && path[path.length-1].lng < 0) && Math.abs(position.Lng) > 100))) { 
    
      // time to cut this path off and create a surface track to setup
      // add this path to the layer and reset to start building a new path
      fltPaths[pathIndex].Layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
      path = [];
      startIndex = index;
    }

    // data required depends on whether elevation is being shown or not
    if (fltPaths[pathIndex].Elev) {
      path.push([position.Lat, position.Lng, position.ASL/1000]);
    } else {
      path.push({lat: position.Lat, lng: position.Lng});
    }
  });
  fltPaths[pathIndex].Layer.addLayer(setupFlightSurfacePath(path, pathIndex, startIndex, path.length));
}

// opens a modal dialog box that holds the mission information
function missionInfoDlg(indexFlt) {

  // compose the dialog HTML?    
  if (!fltPaths[indexFlt].Html) {

    var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
    strHTML += "<img src='" + fltPaths[indexFlt].Info.Img + "' width='256px'></td>";
    strHTML += "<td style='vertical-align: top;'>";
    
    // see if there is a marker link in the description
    if (fltPaths[indexFlt].Info.Desc.indexOf("loc=") >= 0) {
      
      // cut up to the link
      strHTML += fltPaths[indexFlt].Info.Desc.slice(0, fltPaths[indexFlt].Info.Desc.indexOf("<a"));
      
      // extract the popup data, checking for multiple links
      var charLinkIndex = 0;
      for (linkNum=0; linkNum<fltPaths[indexFlt].Info.Desc.match(/<a/g).length; linkNum++) {
        
        // push a new pin group to the list
        fltPaths[indexFlt].Pins.push({Group: []});
        
        // get the full link text
        var linkStr = fltPaths[indexFlt].Info.Desc.slice(fltPaths[indexFlt].Info.Desc.indexOf("<a", charLinkIndex), fltPaths[indexFlt].Info.Desc.indexOf('">', charLinkIndex));

        // iterate through all the pins
        var charPinIndex = 0;
        for (pinNum=0; pinNum<linkStr.match(/loc=/g).length; pinNum++) {
        
          // get the pin from the link
          // this works except for the last pin
          if (pinNum < linkStr.match(/loc=/g).length-1) {
            var pinData = fltPaths[indexFlt].Info.Desc.slice(fltPaths[indexFlt].Info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, fltPaths[indexFlt].Info.Desc.indexOf('&amp', fltPaths[indexFlt].Info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          } else {
            var pinData = fltPaths[indexFlt].Info.Desc.slice(fltPaths[indexFlt].Info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4, fltPaths[indexFlt].Info.Desc.indexOf('"', fltPaths[indexFlt].Info.Desc.indexOf("loc=", charLinkIndex + charPinIndex))).split(",");
          }
          
          // push the data to the group
          fltPaths[indexFlt].Pins[linkNum].Group.push({Lat: pinData[0],
                                                      Lng: pinData[1],
                                                      HTML: pinData[2],
                                                      Pin: null});
                                                                              
          // set the index so we search past the previous location
          charPinIndex = fltPaths[indexFlt].Info.Desc.indexOf("loc=", charLinkIndex + charPinIndex)+4;
        }

        // set the link name
        strHTML += "<span onclick='popupMarkerOpen(" + indexFlt + "," + linkNum + ")' style='color: blue; cursor: pointer'>" + fltPaths[indexFlt].Info.Desc.slice(fltPaths[indexFlt].Info.Desc.indexOf('">', charLinkIndex)+2, fltPaths[indexFlt].Info.Desc.indexOf('</a>', charLinkIndex)) + "</span>";
        
        // set the index so we search past the previous link
        charLinkIndex = fltPaths[indexFlt].Info.Desc.indexOf("</a>", charLinkIndex)+4;
          
        // if we're going around for more links, get the text between this and the next one
        if (fltPaths[indexFlt].Info.Desc.match(/<a/g).length > 1) {
          strHTML += fltPaths[indexFlt].Info.Desc.slice(charLinkIndex, fltPaths[indexFlt].Info.Desc.indexOf("<a", charLinkIndex));
        }
      }
        
      // get the rest of the text
      strHTML += fltPaths[indexFlt].Info.Desc.slice(charLinkIndex, fltPaths[indexFlt].Info.Desc.length);
    } else {
      strHTML += fltPaths[indexFlt].Info.Desc;
    }
    strHTML += "<p><a href='" + fltPaths[indexFlt].Info.Report + "' target='_blank' style='text-decoration: none'>Mission Report</a></td></tr></table>";
    fltPaths[indexFlt].Html = strHTML;
  }
  
  // setup and display the dialog
  $("#mapDialog").dialog("option", "modal", true);
  $("#mapDialog").dialog("option", "title", fltPaths[indexFlt].Info.Title);
  $("#mapDialog").dialog( "option", "buttons", [{
    text: "Close",
    click: function() { 
      $("#mapDialog").dialog("close");
      $("#mapDialog").dialog("option", "modal", false);
    }
  }]);
  $("#progressbar").fadeOut();
  $("#dialogTxt").fadeIn();
  $("#dialogTxt").html(fltPaths[indexFlt].Html);
  $("#mapDialog").dialog("open");

  // inform the user they have to exit fullscreen if it is enabled
  if (isMapFullscreen) {
    flightPositionPopup.setContent("Please press Esc key<br>to exit fullscreen mode!");
    setTimeout(function() { surfaceMap.closePopup(flightPositionPopup); }, 3000);
  }
}

// functions to control the playback of flight data
function prevFltData() {
  clearInterval(flightTimelineInterval);

  // stop the playback
  if ($("#prevFltData").html().includes("X")) {
    $("#prevFltData").html("<<");
    
  // otherwise start the playback
  } else {
    flightTimelineInterval = setInterval(prevFltDataOnce, 1000);
    prevFltDataOnce();
    $("#prevFltData").html("XX");
    $("#nextFltData").html(">>");
  }
}
function prevFltDataOnce() {
  $("#nextFltData").prop("disabled", false);
  $("#nextFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!flightPositionPopup.isOpen() && flightTimelineInterval) clearInterval(flightTimelineInterval);

  // check if we hit the beginning
  if (currentFlightTimelineIndex <= 0) {
    if (flightTimelineInterval) clearInterval(flightTimelineInterval);
    $("#prevFltData").prop("disabled", true);
    $("#prevFltData").html("<<");
    $("#prevFltDataOnce").prop("disabled", true);
    return;
  }
  currentFlightTimelineIndex--;

  // update the popup
  var latlngData = {lat: fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lat, lng: fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lng};
  var cardinal = getLatLngCompass(latlngData);
  flightPositionPopup.setLatLng(latlngData);
  surfaceMap.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + cardinal.Lat + '<br>Longitude: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + cardinal.Lng + '<br>Altitude ASL: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}
function nextFltData() {
  clearInterval(flightTimelineInterval);

  // stop the playback
  if ($("#nextFltData").html().includes("X")) {
    $("#nextFltData").html(">>");
    
  // otherwise start the playback
  } else {
    flightTimelineInterval = setInterval(nextFltDataOnce, 1000);
    nextFltDataOnce();
    $("#nextFltData").html("XX");
    $("#prevFltData").html("<<");
  }
}
function nextFltDataOnce() {
  $("#prevFltData").prop("disabled", false);
  $("#prevFltDataOnce").prop("disabled", false);

  // cancel if the popup is closed
  if (!flightPositionPopup.isOpen() && flightTimelineInterval) clearInterval(flightTimelineInterval);

  // check if we hit the end
  if (currentFlightTimelineIndex >= fltPaths[currentFlightIndex].Data.length-1) {
    if (flightTimelineInterval) clearInterval(flightTimelineInterval);
    $("#nextFltData").prop("disabled", true);
    $("#nextFltData").html(">>");
    $("#nextFltDataOnce").prop("disabled", true);
    return;
  }
  currentFlightTimelineIndex++;

  // update the popup
  var latlngData = {lat: fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lat, lng: fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lng};
  var cardinal = getLatLngCompass(latlngData);
  flightPositionPopup.setLatLng(latlngData);
  surfaceMap.setView(latlngData);
  $("#fltTimelineData").html(UTtoDateTime(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].UT) + ' UTC<br>Latitude: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lat).format('0.0000') + '&deg;' + cardinal.Lat + '<br>Longitude: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Lng).format('0.0000') + '&deg;' + cardinal.Lng + '<br>Altitude ASL: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].ASL/1000).format('0,0.000') + ' km<br>Altitude AGL: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].AGL/1000).format('0,0.000') + " km<br>Velocity: " + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Spd).format('0,0.000') + " m/s" + '<br>Distance from KSC: ' + numeral(fltPaths[currentFlightIndex].Data[currentFlightTimelineIndex].Dist/1000).format('0,0.000') + " km");
}

// load surface track data for any vessels and moons in orbit around this body
function loadSurfaceTracks() {

  // dependent on ops and body catalog data so call back if it's not all loaded yet
  if (!bodyCatalog || (!opsCatalog || (opsCatalog && opsCatalog.find(o => o.isLoading === true)))) {
    setTimeout(loadSurfaceTracks, 50);
    return;
  }

  // search the catalog for any vessels within the current map SOI that have orbital data that is valid for this UT
  var bodyData = bodyCatalog.find(o => o.Body === bodyPaths.bodyName);
  opsCatalog.forEach(function(item) {
    if (item.Type == "vessel" && currSOI(null, item.CurrentData.CatalogData.SOI)[0] == bodyData.ID && item.CurrentData.Orbit && item.CurrentData.Orbit.UT <= currUT()) {
      bodyPaths.paths.push({
        name: currName(null, item.CurrentData.CatalogData.Vessel),
        orbit: item.CurrentData.Orbit,
        index: bodyPaths.paths.length,
        isVessel: true,
        isCalculating: false,
        isLoaded: false
      });
    }
  });

  // does this body have any moons? If so, add them to the list
  if (bodyData.Moons) {
    bodyData.Moons.split(",").forEach(function(item) {
      moonData = bodyCatalog.find(o => o.Body === item.trim());
      bodyPaths.paths.push({
        name: item.trim(),
        orbit: {
          Arg: moonData.Arg,
          Eccentricity: moonData.Ecc,
          Eph: moonData.Eph,
          Inclination: moonData.Inc,
          OrbitalPeriod: moonData.ObtPeriod,
          RAAN: moonData.RAAN,
          SMA: moonData.SMA,
          TrueAnom: moonData.TrueAnom
        },
        index: bodyPaths.paths.length,
        isVessel: false,
        isCalculating: false,
        isLoaded: false
      });
    });
  }
  console.log(bodyPaths);

  // if this body has vessels or moons that need rendering then get it done
  // if (bodyPaths.paths.length) calculateSurfaceTracks(bodyPaths.paths[0].name);
}

// run through all surface tracks that need to be calculated for any body
function calculateSurfaceTracks(currentObject) {

  // first and foremost check that we still have any data to work with in case the map got switched before all calcs completed
  if (!bodyPaths.paths) return;
  
  // setup the layer control to show data load in progress only if we're looking at a body page
  if (!surfaceTracksDataLoad.bodiesTrackDataLoad && pageType == "body") {
    layerControl._expand();
    layerControl.options.collapsed = false;
    surfaceTracksDataLoad.bodiesTrackDataLoad = L.layerGroup();
    layerControl.addOverlay(surfaceTracksDataLoad.bodiesTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Orbital Tracks");
  }

  // remove the layer entirely if we switched to a vessel page
  if (surfaceTracksDataLoad.bodiesTrackDataLoad && pageType == "vessel") layerControl.removeLayer(surfaceTracksDataLoad.bodiesTrackDataLoad);

  // get the current object being calculated
  var currObj = bodyPaths.paths.find(o => o.name === currentObject);

  // have we begun to calculate its orbit data? If not then kick that off
  // we run a lower batch count since the full surface map has more to interact with and should remain responsive
  // orbits are rendered for one orbital period or 24 hours, whichever is shorter
  if (!currObj.isCalculating) {
    if (currObj.orbit.OrbitalPeriod > 86400) orbitalCalc(renderBodyOrbit, currObj.orbit, 500, 86400)
    else orbitalCalc(renderBodyOrbit, orbit, 500)
    currObj.isCalculating = true;
  }

  // has the current object finished calculating and been rendered? Time to move on to the next object
  // if there is no next object, then we are done here
  if (currObj.isLoaded && currObj.index + 1 < bodyPaths.paths.length) {
    currentObject = bodyPaths.paths[currObj.index + 1].name;
  } else return;

  // keep calling ourselves until everything is loaded
  setTimeout(calculateSurfaceTracks, 1, currentObject);
}