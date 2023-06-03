import React, { useState, useRef } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Marker,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function calculateDistance(latlngA, latlngB) {
  const R = 6371; // Radius of the earth in kilometers

  const dLat = (latlngB.lat - latlngA.lat) * (Math.PI / 180);
  const dLon = (latlngB.lng - latlngA.lng) * (Math.PI / 180);
  const latA = latlngA.lat * (Math.PI / 180);
  const latB = latlngB.lat * (Math.PI / 180);

  const y = Math.sin(dLon) * Math.cos(latB);
  const x =
    Math.cos(latA) * Math.sin(latB) -
    Math.sin(latA) * Math.cos(latB) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  const distance =
    R *
    Math.acos(
      Math.sin(latA) * Math.sin(latB) +
        Math.cos(latA) * Math.cos(latB) * Math.cos(dLon)
    );

  return {
    km: distance.toFixed(2),
    nm: (distance * 0.539956803).toFixed(2),
    bearing: (bearing >= 0 ? bearing : 360 + bearing).toFixed(2),
  };
}

function calculateEstimatedTime(distance, speed) {
  const timeInHours = distance / speed;
  const hours = Math.floor(timeInHours);
  const minutes = Math.round((timeInHours - hours) * 60);

  return {
    hours: hours,
    minutes: minutes,
  };
}

function App() {
  const [markerA, setMarkerA] = useState(null);
  const [markerB, setMarkerB] = useState(null);
  const [speed, setSpeed] = useState(5);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [showInputs, setShowInputs] = useState(false);
  const [inputLatA, setInputLatA] = useState("");
  const [inputLngA, setInputLngA] = useState("");
  const [inputLatB, setInputLatB] = useState("");
  const [inputLngB, setInputLngB] = useState("");
  const mapRef = useRef();


  function handleCurrentLocationClick() {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setMarkerA({ lat: latitude, lng: longitude });
      setMarkerB(null);
      mapRef.current.flyTo([latitude, longitude], 10);
    });
  }

  function handleMapClick(event) {
    const { lat, lng } = event.latlng;
  
    if (!markerA) {
      setMarkerA({ lat, lng });
      console.log("Marker A set at Latitude: " + lat + ", Longitude: " + lng);
    } else if (!markerB) {
      setMarkerB({ lat, lng });
      console.log("Marker B set at Latitude: " + lat + ", Longitude: " + lng);
  
      // Calculate the bounds of the markers
      const bounds = L.latLngBounds([markerA, { lat, lng }]);
  
      // Fly to fit the bounds with 10% padding
      mapRef.current.fitBounds(bounds, { padding: [90, 90] });
    } else {
      setMarkerA({ lat, lng });
      setMarkerB(null);
      console.log("Marker A reset at Latitude: " + lat + ", Longitude: " + lng);
    }
  
    // Do something with the coordinates...
  }

  function handleSpeedChange(event) {
    setSpeed(event.target.value);
  }

  function handleToggleSwitch() {
    setShowInputs(!showInputs);
  }

  function handleInputChange(event, field) {
    const value = event.target.value;
    switch (field) {
      case "latA":
        setInputLatA(value);
        break;
      case "lngA":
        setInputLngA(value);
        break;
      case "latB":
        setInputLatB(value);
        break;
      case "lngB":
        setInputLngB(value);
        break;
      default:
        break;
    }
  }

  function handleCoordinatesSubmit(event) {
    event.preventDefault();
    const latA = parseFloat(inputLatA);
    const lngA = parseFloat(inputLngA);
    const latB = parseFloat(inputLatB);
    const lngB = parseFloat(inputLngB);

    if (!isNaN(latA) && !isNaN(lngA) && !isNaN(latB) && !isNaN(lngB)) {
      setMarkerA({ lat: latA, lng: lngA });
      setMarkerB({ lat: latB, lng: lngB });
      setShowInputs(false);
    } else {
      console.log("Invalid coordinates");
    }
  }

  function MapClickHandler() {
    useMapEvents({
      click: handleMapClick,
    });
    return null;
  }

  const redIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  });

  const distances =
    markerA && markerB ? calculateDistance(markerA, markerB) : null;

  React.useEffect(() => {
    if (distances && speed > 0 && !estimatedTime) {
      const estimatedTime = calculateEstimatedTime(distances.nm, speed);
      setEstimatedTime(estimatedTime);
    } else if ((!distances || speed <= 0) && estimatedTime) {
      setEstimatedTime(null);
    }
  }, [distances, speed, estimatedTime]);

  return (
    <div id="app-container">
      <div id="map-container">
      <MapContainer center={[57.8, 11.3]} zoom={6} ref={mapRef}>
          <MapClickHandler />
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerA && <Marker position={[markerA.lat, markerA.lng]} />}
          {markerB && (
            <Marker position={[markerB.lat, markerB.lng]} icon={redIcon} />
          )}
          {markerA && markerB && (
            <Polyline
              positions={[
                [markerA.lat, markerA.lng],
                [markerB.lat, markerB.lng],
              ]}
              color="red"
            />
          )}
        </MapContainer>
      </div>
      <div id="info-container">
      <button onClick={handleCurrentLocationClick}>Mark Current Location</button>

        {distances && (
          <>
            <h2>Distance: {distances.km} km</h2>
            <h2>Distance: {distances.nm} nautical miles</h2>
            <h2>Bearing: {distances.bearing} degrees</h2>
            <div>
              <label htmlFor="speed">Average Boat Speed (knots): </label>
              <input
                type="number"
                id="speed"
                value={speed}
                onChange={handleSpeedChange}
              />
            </div>
            {estimatedTime && (
              <h2>
                Estimated Time: {estimatedTime.hours} hours,{" "}
                {estimatedTime.minutes} minutes
              </h2>
            )}
          </>
        )}

        <div id="lolol">
        <div className="toggle-switch">
          <input
            type="checkbox"
            id="switch"
            checked={showInputs}
            onChange={() => setShowInputs(!showInputs)}
          />
          <label htmlFor="switch">Toggle</label>
        </div>
        <h2>Enter Coordinates Manually</h2>
        </div>


        {showInputs && (
          <form className="coordinates-form" onSubmit={handleCoordinatesSubmit}>
            <h2>Enter Coordinates:</h2>
            <div>
              <label htmlFor="latA">Latitude A: </label>
              <input
                type="text"
                id="latA"
                value={inputLatA}
                onChange={(e) => handleInputChange(e, "latA")}
              />
            </div>
            <div>
              <label htmlFor="lngA">Longitude A: </label>
              <input
                type="text"
                id="lngA"
                value={inputLngA}
                onChange={(e) => handleInputChange(e, "lngA")}
              />
            </div>
            <div>
              <label htmlFor="latB">Latitude B: </label>
              <input
                type="text"
                id="latB"
                value={inputLatB}
                onChange={(e) => handleInputChange(e, "latB")}
              />
            </div>
            <div>
              <label htmlFor="lngB">Longitude B: </label>
              <input
                type="text"
                id="lngB"
                value={inputLngB}
                onChange={(e) => handleInputChange(e, "lngB")}
              />
            </div>
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
