import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MatchpointPage from "./pages/MatchpointPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import Navbar from "./components/Navbar";
import { TeamAnalyticsPage } from "./pages/TeamAnalytics/TeamAnalyticsPage";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/matchpoint" element={<MatchpointPage />} />
            <Route
              path="/matchpoint/event/:eventKey"
              element={<EventDetailPage />}
            />
            <Route path="/docs/api/v1" element={<ApiDocsPage />} />
            <Route
              path="/matchpoint/match/:matchKey"
              element={<MatchDetailPage />}
            />
            <Route path="/radar" element={<TeamAnalyticsPage />} />
            <Route
              path="/radar/event/:eventKey"
              element={<TeamAnalyticsPage />}
            />
            <Route
              path="/radar/match/:matchKey"
              element={<TeamAnalyticsPage />}
            />
            <Route
              path="/radar/event/:eventKey/teams/:teamList"
              element={<TeamAnalyticsPage />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
