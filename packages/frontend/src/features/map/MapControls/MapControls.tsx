import {
  LocateFixed,
  Locate,
  SlidersHorizontal,
  Plus,
  Box,
  Droplet,
  Battery,
  Feather,
  Tv,
} from "lucide-react";
import Button from "../../../components/Button/Button";
import ChipGroup, {
  type ChipItem,
} from "../../../components/ChipGroup/ChipGroup";
import Tooltip from "../../../components/Tooltip/Tooltip";
import { UI_TEXT } from "../../../constants/uiText";
import "./MapControls.css";

const FILTER_ITEMS: ChipItem[] = [
  {
    value: "paper",
    label: UI_TEXT.categories.paper,
    icon: <Box size={18} />,
    tint: "paper",
  },
  {
    value: "plastic",
    label: UI_TEXT.categories.plastic,
    icon: <Droplet size={18} />,
    tint: "plastic",
  },
  {
    value: "batteries",
    label: UI_TEXT.categories.batteries,
    icon: <Battery size={18} />,
    tint: "batteries",
  },
  {
    value: "clothes",
    label: UI_TEXT.categories.clothes,
    icon: <Feather size={18} />,
    tint: "clothes",
  },
  {
    value: "ewaste",
    label: UI_TEXT.categories.ewaste,
    icon: <Tv size={18} />,
    tint: "ewaste",
  },
];

interface MapControlsProps {
  isFollowing: boolean;
  selectedCategories: string[];
  onSelectCategories: (categories: string[]) => void;
  onRecenter: () => void;
  onOpenFilters: () => void;
  onAddBin: () => void;
}

export function MapControls({
  isFollowing,
  selectedCategories,
  onSelectCategories,
  onRecenter,
  onOpenFilters,
  onAddBin,
}: MapControlsProps) {
  const hasActiveFilters = selectedCategories.length > 0;

  return (
    <div className="ui-overlay">
      {/* Top controls (Logo + Filters) */}
      <div className="controls-top-section">
        <div className="top-bar">
          <h1 className="bitcount-logo">{UI_TEXT.common.appName}</h1>
        </div>

        <ChipGroup
          items={FILTER_ITEMS}
          value={selectedCategories}
          onValueChange={onSelectCategories}
          mode="single"
          layout="scroll"
          ariaLabel={UI_TEXT.map.quickFiltersAria}
        />

        <div className="controls-top-right">
          <Tooltip content={UI_TEXT.map.openFiltersTooltip} placement="left">
            <Button
              variant="icon"
              size="sm"
              onClick={onOpenFilters}
              isActive={hasActiveFilters}
              aria-label={UI_TEXT.map.openFiltersAria}
            >
              <SlidersHorizontal size={20} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Controls on the bottom (Recenter GPS) */}
      <div className="controls-bottom-right">
        <Tooltip content={UI_TEXT.map.addBinTooltip} placement="left">
          <Button
            variant="icon"
            size="md"
            onClick={onAddBin}
            aria-label={UI_TEXT.map.addBinAria}
          >
            <Plus size={22} />
          </Button>
        </Tooltip>

        <Tooltip
          content={
            isFollowing
              ? UI_TEXT.map.recenterActiveTooltip
              : UI_TEXT.map.recenterInactiveTooltip
          }
          placement="left"
        >
          <Button
            variant="icon"
            size="sm"
            onClick={onRecenter}
            isActive={isFollowing}
            aria-label={
              isFollowing
                ? UI_TEXT.map.recenterActiveTooltip
                : UI_TEXT.map.recenterInactiveTooltip
            }
          >
            {isFollowing ? <LocateFixed size={20} /> : <Locate size={20} />}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
