import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapPage } from "./routes/MapPage/MapPage";
import AppLayout from "./layout/AppLayout";
import { AchievementPage } from "./routes/AchievementPage/AchievementPage";
import { LoginPage } from "./routes/LoginPage/LoginPage";

export function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* MapPage is the landing page */}
          <Route path="/" element={<MapPage />} />
          <Route path="/achievements" element={<AchievementPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
