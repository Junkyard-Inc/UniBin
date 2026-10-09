import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import "./MapBackground.css";
import { getUserLocation, type UserCoordinates } from "../../services/location";

export function MapBackground() {

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [ location, setLocation ] = useState<UserCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocation() {
      try {
        setLoading(true);
        // Attende la risoluzione della Promise
        const coords = await getUserLocation();
        setLocation(coords);
      } catch (err) {
        console.error("Errore geolocalizzazione:", err);
        setError("Impossibile accedere alla posizione. Verifica i permessi GPS.");
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, []);

  useEffect(() => {

    if (!location || !mapContainerRef.current ) return;
    if (!mapRef.current) {
      
      // Inizializziamo la mappa passandogli il riferimento (current) invece della stringa 'map'
      const map = L.map(mapContainerRef.current, {zoomControl: false}  ).setView([location.latitude, location.longitude], 15);
  
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      L.marker([location.latitude, location.longitude])
        .addTo(map)
        .bindPopup("<b>Sei qui.</b>")
        .openPopup();
      
      mapRef.current = map;
    }

  }, [location]);
  

  if (loading) {
    return <div className="map-loading">Ricerca posizione GPS in corso...</div>;
  }

  if (error) {
    return <div className="map-error">{error}</div>;
  }
  

  return <div ref={mapContainerRef} className="mapContainer"></div>;
}

export default MapBackground;