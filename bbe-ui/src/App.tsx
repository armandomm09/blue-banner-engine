import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage'; // Asegúrate de crear este archivo
import MatchpointPage from './pages/MatchpointPage'; // Este es el archivo que actualizaremos
import MatchDetailPage from './pages/MatchDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import ApiDocsPage from './pages/ApiDocsPage';

const Navbar: React.FC = () => (
  <nav className="w-full p-6 bg-background/95 backdrop-blur-sm border-b border-border">
    <div className="container mx-auto max-w-7xl flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-white hover:text-accent transition-colors">
        BBE
      </Link>
      <div className="flex items-center space-x-6">
        <Link to="/" className="text-lg text-text-muted hover:text-white transition-colors">
          Home
        </Link>
        <Link to="/matchpoint" className="text-lg text-white bg-accent/80 hover:bg-accent px-4 py-2 rounded-lg font-semibold transition-colors">
          Go to Matchpoint
        </Link>
      </div>
    </div>
  </nav>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        {/* <Navbar /> */}
        <main className="pt-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/matchpoint" element={<MatchpointPage />} />
            <Route path="/matchpoint/event/:eventKey" element={<EventDetailPage />} />
            <Route path="/docs/api/v1" element={<ApiDocsPage />} />
            <Route path="/matchpoint/match/:matchKey" element={<MatchDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;