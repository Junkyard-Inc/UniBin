import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapPage } from "./routes/MapPage/MapPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* MapPage is the landing page */}
        <Route path="/" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;