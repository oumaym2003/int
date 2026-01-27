import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Accueil from './components/Accueil';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route par défaut - redirige vers login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Page de connexion */}
        <Route path="/login" element={<Login />} />
        
        {/* Page de diagnostic */}
        <Route path="/diagnostic" element={<Accueil />} />
        
        {/* Route 404 - page non trouvée */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;