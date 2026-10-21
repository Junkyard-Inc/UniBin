import { useEffect, useRef, useState } from "react";
import { MapBackground } from "./components/MapBackground/MapBackground";
import "./index.css";
import L from "leaflet";
import { stopWatchingLocation, watchUserLocation, type UserCoordinates } from "./services/location";

export function App() {
  const [ location, setLocation ] = useState<UserCoordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);

  const mapInstanceRef = useRef<L.Map | null>(null);

  // 1. effect used to initialize the watcher for the user position. 
  // Sets the location state to new coordinates every time the browser detects some changes
  useEffect(() => {
    const watchId = watchUserLocation(
        (coords) => {
          setLocation(coords);
          setLoading(false);
        },
        (err) => {
          console.error("Errore GPS:", err);
          setError("Impossibile accedere alla posizione. Verifica i permessi GPS.");
          setLoading(false);
        }
    );

    return () => {
      if (watchId !== null) stopWatchingLocation(watchId);
    };
  }, []);

  // 2. effect used to center the map if isFollowing is true 
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return;

    if (isFollowing) {
      mapInstanceRef.current.panTo([location.latitude, location.longitude], { animate: true });
    }
  }, [location, isFollowing]);

    // function used to set the isFollowing state to make the map pan to the user position while moving
  const handleRecenter = () => {
    if (mapInstanceRef.current && location) {
      setIsFollowing(true);
      mapInstanceRef.current.setView
        ([location.latitude, location.longitude], 
        mapInstanceRef.current.getZoom(), 
        { animate: true}
      );
    }
  };

  if (loading) return <div className="map-loading">Ricerca posizione GPS in corso...</div>;

  if (error) return <div className="map-error">{error}</div>;

  return (
    <div className="app-container">
      {/* 1. Mappa come sfondo */}
      <MapBackground
        center={location ? [location.latitude, location.longitude] : [44.801, 10.328]}
        userLocation={location}
        onMapReady={(map) =>{
          mapInstanceRef.current = map;
        }}
        onMapDrag={() => {
          setIsFollowing(false);
        }}
      />

      {/* 2. Layer UI sovrapposto */}
      <div className="ui-overlay">
        <header className="top-bar">
          <h1 className="bitcount-logo">UNIBIN</h1>
          {/* <input type="search" placeholder="Cerca punto sulla mappa..." /> */}
        </header>

      </div>
    </div>
  );
}

export default App;
