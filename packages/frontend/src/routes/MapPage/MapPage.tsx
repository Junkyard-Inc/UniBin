import { useState } from "react";
import { MapBackground } from "../../features/map/MapBackground/MapBackground";
import { MapControls } from "../../features/map/MapControls/MapControls";
import "./MapPage.css";

export function MapPage() {
  const [isFollowing, setIsFollowing] = useState<boolean>(true);

  const handleRecenter = () => {
    setIsFollowing(true);
  };

  return (
    <div className="app-container">
      <MapBackground
        center={[44.801, 10.328]} // Initial coordinates for fallback (Parma)
        isFollowing={isFollowing}
        onMapDrag={() => setIsFollowing(false)}
      />

      {/* UI Overlay controls*/}
      <MapControls
        isFollowing={isFollowing}
        onRecenter={handleRecenter}
        onOpenFilters={() => console.log("Open bins filters")}
      />
    </div>
  );
}

export default MapPage;
