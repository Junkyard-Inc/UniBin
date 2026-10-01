import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import "./MapBackground.css";

export function MapBackground() {
  // 1. Creiamo un riferimento per il div che conterrà la mappa
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // 2. Creiamo un riferimento per l'istanza della mappa (utile per evitare doppie inizializzazioni in Strict Mode)
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // 3. Assicuriamoci che il div esista e che la mappa non sia già stata inizializzata
    if (mapContainerRef.current && !mapRef.current) {
      
      // Inizializziamo la mappa passandogli il riferimento (current) invece della stringa 'map'
      mapRef.current = L.map(mapContainerRef.current, {zoomControl: false}  ).setView([44.801, 10.3280], 14);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapRef.current);
    }

    // 4. Funzione di cleanup: distrugge la mappa se il componente viene smontato
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // L'array vuoto significa: esegui questo effetto solo al montaggio del componente

  return <div ref={mapContainerRef} className="mapContainer"></div>;
}

export default MapBackground;