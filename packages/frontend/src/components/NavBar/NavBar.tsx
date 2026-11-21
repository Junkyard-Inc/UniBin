import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Map, Award, CircleUser, LogIn } from "lucide-react";
import Button from "../Button/Button";
import { UI_TEXT } from "../../constants/uiText";
import "./NavBar.css";

export interface NavBarProps {
  isAuthenticated: boolean;
  paths?: {
    map?: string;
    trophies?: string;
    profile?: string;
    login?: string;
  };
  className?: string;
}

export function NavBar({
  isAuthenticated,
  paths = {
    map: "/",
    trophies: "/achievements",
    profile: "/profile",
    login: "/login",
  },
  className = "",
}: NavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const mapPath = paths.map ?? "/";
  const trophiesPath = paths.trophies ?? "/trophies";
  const accountPath = isAuthenticated
    ? (paths.profile ?? "/profile")
    : (paths.login ?? "/login");

  const isMapActive = location.pathname === mapPath;
  const isTrophiesActive = location.pathname.startsWith(trophiesPath);
  const isAccountActive =
    location.pathname.startsWith(paths.profile ?? "/profile") ||
    location.pathname.startsWith(paths.login ?? "/login");

  return (
    <nav
      className={`unibin-bottom-nav ${className}`}
      aria-label="Navigazione principale"
    >
      <div className="unibin-bottom-nav-inner">
        <Button
          variant="nav"
          isActive={isMapActive}
          onClick={() => navigate(mapPath)}
          aria-current={isMapActive ? "page" : undefined}
        >
          <Map size={22} strokeWidth={isMapActive ? 2.4 : 2} />
          <span>{UI_TEXT.nav.map}</span>
        </Button>

        <Button
          variant="nav"
          isActive={isTrophiesActive}
          onClick={() => navigate(trophiesPath)}
          aria-current={isTrophiesActive ? "page" : undefined}
        >
          <Award size={22} strokeWidth={isTrophiesActive ? 2.4 : 2} />
          <span>{UI_TEXT.nav.trophies}</span>
        </Button>

        <Button
          variant="nav"
          isActive={isAccountActive}
          onClick={() => navigate(accountPath)}
          aria-current={isAccountActive ? "page" : undefined}
        >
          {isAuthenticated ? (
            <>
              <CircleUser size={22} strokeWidth={isAccountActive ? 2.4 : 2} />
              <span>{UI_TEXT.nav.profile}</span>
            </>
          ) : (
            <>
              <LogIn size={22} strokeWidth={isAccountActive ? 2.4 : 2} />
              <span>{UI_TEXT.nav.login}</span>
            </>
          )}
        </Button>
      </div>
    </nav>
  );
}

export default NavBar;
