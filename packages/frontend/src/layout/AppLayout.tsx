import NavBar from "../components/NavBar/NavBar";
import { useState } from "react";
import "./AppLayout.css";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAuthenticated] = useState<boolean>(false);

  return (
    <div className="app-shell">
      <main className="app-main-content">{children}</main>
      <NavBar isAuthenticated={isAuthenticated} />
    </div>
  );
}

export default AppLayout;
