import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import "./MapBackground.css";
import { type UserCoordinates } from "../../services/location";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapBackgroundProps {
  center: [number, number];
  userLocation: UserCoordinates | null;
  onMapReady?: (map: L.Map) => void; // Restituisce l'istanza della mappa ad App.tsx
  onMapDrag?: () => void;            // Avvisa App.tsx se l'utente sposta la mappa
}

export function MapBackground({center, userLocation, onMapReady, onMapDrag}: MapBackgroundProps) {

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);


  // 1. effect used to first create the map layer
  useEffect(() => {

    if (mapRef.current || !mapContainerRef.current ) return;
      
    // Inizializziamo la mappa passandogli il riferimento (current) invece della stringa 'map'
    const map = L.map(mapContainerRef.current, {zoomControl: false}  ).setView(
      center,
      15
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    map.on("dragstart", () => {
      if (onMapDrag) onMapDrag();
    });
    
    mapRef.current = map;

    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
    };
  }, []);

  // 2. effect that updates the marker position when the location state changes
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const latLng: [number, number] = [userLocation.latitude, userLocation.longitude];
    
    // the map follow the user position only when isFollowing state is true
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.circleMarker(latLng, {
        radius: 10,           // Dimensione del cerchio in pixel
        fillColor: "#2563eb", // Colore interno (un bel blu acceso)
        color: "#ffffff",     // Colore del bordo esterno
        weight: 3,            // Spessore del bordo bianco
        opacity: 1,
        fillOpacity: 0.9,
      }) 
      .addTo(mapRef.current)
      .bindPopup("<b>Sei qui!</b>");

    }
  }, [userLocation]);  

  return <div ref={mapContainerRef} className="mapContainer"></div>;
}

export default MapBackground;