import { useState } from "react";
import { MapBackground } from "../../features/map/MapBackground/MapBackground";
import { MapControls } from "../../features/map/MapControls/MapControls";
import Drawer from "../../components/Drawer/Drawer";
import { UI_TEXT } from "../../constants/uiText";
import "./MapPage.css";
import Button from "../../components/Button/Button";
import { FILTER_ITEMS } from "../../constants/chipItems";
import ChipGroup from "../../components/ChipGroup/ChipGroup";
import Dialog from "../../components/Dialog/Dialog";
import { useNavigate } from "react-router-dom";

export function MapPage() {
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState<boolean>(false);
  const navigate = useNavigate();

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
        selectedCategories={selectedCategories}
        onSelectCategories={setSelectedCategories}
        onRecenter={handleRecenter}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onAddBin={() => setIsAuthDialogOpen(true)}
      />

      <Drawer
        placement="top"
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        title={UI_TEXT.map.filtersDrawerTitle}
        description={UI_TEXT.map.filtersDrawerSubtitle}
        footer={
          <>
            <Button
              className="btn-neutral"
              variant="neutral"
              onClick={() => setSelectedCategories([])}
            >
              {UI_TEXT.common.reset}
            </Button>
            <Button
              className="btn-primary"
              variant="primary"
              onClick={() => setIsFiltersOpen(false)}
            >
              {UI_TEXT.common.apply}
            </Button>
          </>
        }
      >
        <ChipGroup
          items={FILTER_ITEMS}
          value={selectedCategories}
          onValueChange={setSelectedCategories}
          mode="multiple"
          layout="grid"
        />
      </Drawer>

      <Dialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        title={UI_TEXT.authPrompt.title}
        description={UI_TEXT.authPrompt.description}
        footer={
          <>
            <Button
              className="btn-neutral"
              variant="neutral"
              onClick={() => setIsAuthDialogOpen(false)}
            >
              {UI_TEXT.authPrompt.cancelCta}
            </Button>
            <Button
              className="btn-primary"
              variant="primary"
              onClick={() => navigate("/login")}
            >
              {UI_TEXT.authPrompt.loginCta}
            </Button>
          </>
        }
      />
    </div>
  );
}

export default MapPage;
