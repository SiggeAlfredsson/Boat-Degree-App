
import './App.css';

import "leaflet/dist/leaflet.css"

import { MapContainer, TileLayer } from 'react-leaflet';



function App() {
  return (
    <div id='map-container'>
    <MapContainer center={[57.8, 11.3]} zoom={10}>
      <TileLayer
        attribution=''
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
    </MapContainer>
    </div>
  );
}

export default App;
