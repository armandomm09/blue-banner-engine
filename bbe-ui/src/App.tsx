// src/App.tsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";

// Layouts
import MainLayout from "./layouts/MainLayout";

// Pages
import HomePage from "./pages/HomePage";
import MatchpointPage from "./pages/MatchpointPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import EventDetailPage from "./pages/EventDetailPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import NotFoundPage from "./pages/NotFoundPage";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import ThemeManager from "./components/ThemeManager";
import { TeamAnalyticsPage } from "./pages/TeamAnalytics/TeamAnalyticsPage";

// Scouting
import FormsListPage from "./pages/Scouting/FormsListPage";
import FormBuilderPage from "./pages/Scouting/FormBuilderPage";
import PitScoutPage from "./pages/Scouting/PitScoutPage";
import MatchScoutPage from "./pages/Scouting/MatchScoutPage";

// Dashboard
import SubmissionsDashboard from "./pages/Dashboard/SubmissionsDashboard";
import { TeamDashboard } from "./pages/Dashboard/TeamDashboard";
import { CompareDashboard } from "./pages/Dashboard/CompareDashboard";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeManager>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/verify" element={<VerifyEmailPage />} />

              <Route index element={<HomePage />} />

              <Route path="/matchpoint" element={<MatchpointPage />} />
              <Route
                path="/matchpoint/event/:eventKey"
                element={<EventDetailPage />}
              />
              <Route
                path="/matchpoint/match/:matchKey"
                element={<MatchDetailPage />}
              />

              <Route path="/analytics" element={<TeamAnalyticsPage />} />
              <Route
                path="/analytics/event/:eventKey"
                element={<TeamAnalyticsPage />}
              />
              <Route
                path="/analytics/match/:matchKey"
                element={<TeamAnalyticsPage />}
              />
              <Route
                path="/analytics/event/:eventKey/teams/:teamList"
                element={<TeamAnalyticsPage />}
              />

              <Route path="/docs/api/v1" element={<ApiDocsPage />} />

              <Route
                path="/forms"
                element={
                  <ProtectedRoute>
                    <FormsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/builder/:formId"
                element={
                  <ProtectedRoute>
                    <FormBuilderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scout/pit"
                element={
                  <ProtectedRoute>
                    <PitScoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scout/match"
                element={
                  <ProtectedRoute>
                    <MatchScoutPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/submissions/:type"
                element={
                  <ProtectedRoute>
                    <SubmissionsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/submissions"
                element={
                  <ProtectedRoute>
                    <SubmissionsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/submissions"
                element={
                  <ProtectedRoute>
                    <SubmissionsDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="/team/:teamNumber" element={<TeamDashboard />} />
              <Route path="/teams" element={<CompareDashboard />} />

              <Route
                path="/welcome"
                element={
                  <ProtectedRoute>
                    <WelcomePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ThemeManager>
      </AuthProvider>
    </Router>
  );
}

export default App;
