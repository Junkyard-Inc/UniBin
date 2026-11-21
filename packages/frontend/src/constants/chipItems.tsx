import type { ChipItem } from "../components/ChipGroup/ChipGroup";
import { Battery, Box, Droplet, Feather, Tv } from "lucide-react";
import { UI_TEXT } from "./uiText";

export const FILTER_ITEMS: ChipItem[] = [
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
