import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Stethoscope } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export default function Login({ onLogin, isAuthenticated }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });

  // Redirection dès que l'état change
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/diagnostic');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('email', formData.email)
        .single();

      if (error || !data) throw new Error("Compte inconnu.");
      if (data.mot_de_passe !== formData.password) throw new Error("Mot de passe faux.");

      // On enregistre dans le navigateur
      localStorage.setItem('user', JSON.stringify(data));
      
      // On prévient l'application
      if (onLogin) onLogin();
      
      // Navigation après connexion réussie
      navigate('/diagnostic');

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <Stethoscope className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Diagnostic ORL</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white outline-none"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
            Lancer la session <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}