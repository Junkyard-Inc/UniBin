import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapPage } from "./routes/MapPage/MapPage";
import AppLayout from "./layout/AppLayout";
import { AchievementPage } from "./routes/AchievementPage/AchievementPage";

export function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* MapPage is the landing page */}
          <Route path="/" element={<MapPage />} />
          <Route path="/achievements" element={<AchievementPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
