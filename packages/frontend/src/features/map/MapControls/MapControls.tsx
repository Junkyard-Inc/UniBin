import { IconButton, Tooltip } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import GpsNotFixedIcon from "@mui/icons-material/GpsNotFixed";
import FilterListIcon from "@mui/icons-material/FilterList";
import "./MapControls.css";

interface MapControlsProps {
  isFollowing: boolean;
  onRecenter: () => void;
  onOpenFilters: () => void;
  //onAddBin?: () => void; // TODO: option for logged Users to add a bin
  //isLoggedIn?: boolean;  // TODO: flag to show or hide functionalities based on user authentication
}

export function MapControls({
  isFollowing,
  onRecenter,
  onOpenFilters,
}: MapControlsProps) {
  return (
    <div className="ui-overlay">
      {/* Top controls (es. Filters) */}
      <div className="controls-top-section">
        <div className="top-bar">
          <h1 className="bitcount-logo">UNIBIN</h1>
        </div>
        <div className="controls-top-right">
          <Tooltip title="Filter bins" arrow>
            <IconButton
              className="map-action-btn"
              onClick={onOpenFilters}
              style={{
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Controls on the bottom (es. Recenter GPS) */}
      <div className="controls-bottom-right">
        {/* GPS / Recenter button */}
        <Tooltip
          title={isFollowing ? "Active panning" : "Center on user position"}
          arrow
        >
          <IconButton
            onClick={onRecenter}
            style={{
              backgroundColor: isFollowing ? "#2563eb" : "#ffffff",
              color: isFollowing ? "#ffffff" : "#1f2937",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              padding: "12px",
            }}
          >
            {isFollowing ? <MyLocationIcon /> : <GpsNotFixedIcon />}
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
