import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MatchpointPage from './pages/MatchpointPage';

const Navbar: React.FC = () => (
  <nav className="absolute top-0 left-0 right-0 p-6 z-10">
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
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/matchpoint" element={<MatchpointPage />} />
      </Routes>
    </Router>
  );
}

export default App;