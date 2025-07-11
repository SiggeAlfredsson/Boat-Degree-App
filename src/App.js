import React, { useState, useRef, useEffect } from "react";
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

// ✅ CORRECT DEFAULT ICON SETUP for React + Leaflet + Webpack

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;



// Helper to calculate distance & bearing between two points
function calculateDistance(latlngA, latlngB) {
  const R = 6371; // km
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

// Helper to calculate estimated time
function calculateEstimatedTime(distance, speed) {
  const timeInHours = distance / speed;
  return {
    hours: Math.floor(timeInHours),
    minutes: Math.round((timeInHours - Math.floor(timeInHours)) * 60),
  };
}

function App() {
  const [markers, setMarkers] = useState([]);
  const [speed, setSpeed] = useState(5);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [totalDistance, setTotalDistance] = useState(null);
  const [showInputs, setShowInputs] = useState(false);
  const [inputLatA, setInputLatA] = useState("");
  const [inputLngA, setInputLngA] = useState("");
  const [inputLatB, setInputLatB] = useState("");
  const [inputLngB, setInputLngB] = useState("");
  const [heading, setHeading] = useState(null);
  const mapRef = useRef();

  function handleCurrentLocationClick() {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setMarkers([{ lat: latitude, lng: longitude }]);
      mapRef.current.flyTo([latitude, longitude], 10);
    });
  }

  function handleMapClick(event) {
    const { lat, lng } = event.latlng;
    setMarkers((prev) => [...prev, { lat, lng }]);

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]).concat([[lat, lng]]));
      mapRef.current.fitBounds(bounds, { padding: [90, 90] });
    }
  }

  function handleClearMarkers() {
    setMarkers([]);
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
      case "latA": setInputLatA(value); break;
      case "lngA": setInputLngA(value); break;
      case "latB": setInputLatB(value); break;
      case "lngB": setInputLngB(value); break;
      default: break;
    }
  }

  function handleCoordinatesSubmit(event) {
    event.preventDefault();
    const latA = parseFloat(inputLatA);
    const lngA = parseFloat(inputLngA);
    const latB = parseFloat(inputLatB);
    const lngB = parseFloat(inputLngB);

    if (!isNaN(latA) && !isNaN(lngA) && !isNaN(latB) && !isNaN(lngB)) {
      setMarkers((prev) => [...prev, { lat: latA, lng: lngA }, { lat: latB, lng: lngB }]);
      setShowInputs(false);
    } else {
      console.log("Invalid coordinates");
    }
  }

  function MapClickHandler() {
    useMapEvents({ click: handleMapClick });
    return null;
  }

  // Red icon for additional markers
  const redIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    shadowSize: [41, 41],
  });

  // Calculate total distance & estimated time
  useEffect(() => {
    let total = 0;
    for (let i = 1; i < markers.length; i++) {
      total += parseFloat(calculateDistance(markers[i - 1], markers[i]).nm);
    }
    if (total > 0) {
      setTotalDistance(total.toFixed(2));
      if (speed > 0) {
        setEstimatedTime(calculateEstimatedTime(total, speed));
      } else {
        setEstimatedTime(null);
      }
    } else {
      setTotalDistance(null);
      setEstimatedTime(null);
    }

    if (markers.length === 2) {
      const { bearing } = calculateDistance(markers[0], markers[1]);
      setHeading(bearing);
    } else {
      setHeading(null);
    }
  }, [markers, speed]);

  return (
    <div id="app-container">
      <div id="map-container">
        <MapContainer center={[57.8, 11.3]} zoom={6} ref={mapRef}>
          <MapClickHandler />
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat, m.lng]}
            icon={i === 0 ? DefaultIcon : redIcon}
            eventHandlers={{
              click: () => {
                // Remove marker at index i
                setMarkers((prev) => prev.filter((_, index) => index !== i));
              },
            }}ö
          />
          ))}
          {markers.length > 1 && (
            <Polyline
              positions={markers.map((m) => [m.lat, m.lng])}
              color="red"
            />
          )}
        </MapContainer>
      </div>

      <div id="info-container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px', // optional, spacing between items
          marginBottom: '10px' // spacing below this row
        }}>
          <button onClick={handleCurrentLocationClick}>Mark Current Location</button>
          <button onClick={handleClearMarkers}>Clear Markers</button>
          {markers.length == 2 && (
            <div style={{ 
              width: '30px',
              height: '30px',
              border: '2px solid #333',
              borderRadius: '50%',
              backgroundColor: 'black',
              position: 'relative',
              flexShrink: 0
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '2px',
                height: '50%',
                borderRadius: '10px',
                background: 'red',
                transform: `translate(-50%, -100%) rotate(${heading}deg)`,
                transformOrigin: 'bottom center'
              }} />
            </div>
          )}
        </div>
        {totalDistance && (
          <>
            <h2>Total Distance: {totalDistance} nautical miles</h2>
              {heading && (
                <h2>Heading: {heading}°</h2>
              )}

            <div>
              <label htmlFor="speed">Average Boat Speed (knots): </label>
              <input
                type="number"
                id="speed"
                value={speed}
                min="0"
                onChange={handleSpeedChange}
              />
            </div>
            {estimatedTime && (
              <h2>
                Estimated Time: {estimatedTime.hours} hours, {estimatedTime.minutes} minutes
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
              onChange={handleToggleSwitch}
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
