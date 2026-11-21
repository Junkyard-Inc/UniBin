import { Construction } from "lucide-react";
import { UI_TEXT } from "../../constants/uiText";
import "./AchievementPage.css";

export function AchievementPage() {
  return (
    <div className="wip-banner">
      <Construction size={40} strokeWidth={1.6}></Construction>
      <h1 className="wip-title">{UI_TEXT.achievements.wipTitle}</h1>
      <p className="wip-description">{UI_TEXT.achievements.wipDescription}</p>
    </div>
  );
}
