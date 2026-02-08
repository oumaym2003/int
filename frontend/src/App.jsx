
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Accueil from './pages/Accueil';
import MesImages from './pages/MesImages';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('user'));
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    setIsAuthenticated(Boolean(storedUser));

    const handleStorage = (event) => {
      if (event.key === 'user') {
        setIsAuthenticated(Boolean(event.newValue));
      }
    };

    const handleAuthChange = () => {
      const nextUser = localStorage.getItem('user');
      setIsAuthenticated(Boolean(nextUser));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Callback à passer au composant Login
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Route protégée
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login onLogin={handleLogin} isAuthenticated={isAuthenticated} />} />
        <Route path="/diagnostic" element={
          <ProtectedRoute>
            <Accueil />
          </ProtectedRoute>
        } />
        <Route path="/mes-images" element={
          <ProtectedRoute>
            <MesImages />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;