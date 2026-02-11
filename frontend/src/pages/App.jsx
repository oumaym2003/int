import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Accueil from './pages/Accueil';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setIsAuthenticated(true);
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // On laisse le useEffect ou le composant Login gérer la suite
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLoginSuccess} isAuthenticated={isAuthenticated} />} />
        <Route path="/accueil" element={isAuthenticated ? <Accueil /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;