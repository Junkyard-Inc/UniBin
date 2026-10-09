import { MapBackground } from "./components/MapBackground/MapBackground";
import "./index.css";

export function App() {
  return (
    <div className="app-container">
      {/* 1. Mappa come sfondo */}
      <MapBackground />

      {/* 2. Layer UI sovrapposto */}
      <div className="ui-overlay">
        <header className="top-bar">
          <h1>UniBin</h1>
          {/* <input type="search" placeholder="Cerca punto sulla mappa..." /> */}
        </header>
      </div>
    </div>
  );
}

export default App;
