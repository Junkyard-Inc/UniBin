import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import "./MapBackground.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapBackgroundProps {
  center: [number, number];
  isFollowing: boolean;
  onLocationUpdate?: (latlng: [number, number]) => void;
  onMapReady?: (map: L.Map) => void; // Return the map instance to App.tsx
  onMapDrag?: () => void; // Notifies App.tsx if the user pan the view on the map
}

export function MapBackground({
  center,
  isFollowing,
  onLocationUpdate,
  onMapReady,
  onMapDrag,
}: MapBackgroundProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const lastLatLngRef = useRef<[number, number] | null>(null);
  const isFollowingRef = useRef(isFollowing);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  // 1. effect used to first create the map layer
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Map inizialization passing the reference to container
    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
      center,
      15,
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("dragstart", () => {
      if (onMapDrag) onMapDrag();
    });

    mapRef.current = map;

    // leaflet location event
    map.on("locationfound", (e: L.LocationEvent) => {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      lastLatLngRef.current = latlng;

      // Update or create a circleMarker
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.circleMarker(latlng, {
          radius: 10,
          fillColor: "#2563eb",
          color: "#ffffff",
          weight: 3,
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup("<b>You are here!</b>");
      }

      if (isFollowingRef.current) {
        map.panTo(latlng, { animate: true });
      }

      // Notify the parent component (App.tsx) if needed
      if (onLocationUpdate) {
        onLocationUpdate(latlng);
      }
    });

    map.on("locationerror", (e) => {
      console.error("Geolocalization error on Leaflet:", e.message);
    });

    map.locate({
      watch: true, // Keep the tracking active like Geolocation.watchPosition()
      enableHighAccuracy: true,
      maximumAge: 0,
    });

    mapRef.current = map;

    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.stopLocate();
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // 2. effect that manage the automatic recentering (panTo) when 'isFollowing' true and new coordinates drop
  useEffect(() => {
    if (!isFollowing || !mapRef.current) return;

    if (lastLatLngRef.current) {
      mapRef.current.setView(lastLatLngRef.current, mapRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [isFollowing]);

  return <div ref={mapContainerRef} className="mapContainer"></div>;
}

export default MapBackground;
