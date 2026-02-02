import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../firebaseClient';
import { User, Lock, ArrowRight, Stethoscope, Activity } from 'lucide-react';


export default function Login({ onLogin, isAuthenticated }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Si déjà authentifié, redirige vers /diagnostic
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/diagnostic');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await signIn(formData.email, formData.password);
      const token = await result.user.getIdToken();
      if (token) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('uid', result.user.uid);
        localStorage.setItem('nomMedecin', result.user.displayName || '');
      }
      if (onLogin) onLogin();
      navigate('/diagnostic');
    } catch (error) {
      const message = error?.message || 'Identifiants invalides';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background animé */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 animate-gradient"></div>
      
      {/* Particules médicales */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-blue-400 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-cyan-300 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-blue-300 rounded-full animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-cyan-500 rounded-full animate-float"></div>
      </div>

      {/* Section Gauche - Image Médicale */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12">
        <div className="relative z-10 text-center space-y-6 animate-float-card">
          {/* Icône médicale stylisée */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-30 rounded-full"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-12 shadow-2xl">
                <Stethoscope className="w-32 h-32 text-cyan-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Texte d'accueil */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Diagnostic ORL
            </h1>
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <Activity className="w-5 h-5" />
              <p className="text-xl font-light">Système Expert de Diagnostic</p>
            </div>
            <p className="text-blue-200/70 text-lg max-w-md mx-auto leading-relaxed">
              Plateforme professionnelle pour l'analyse et le diagnostic des pathologies otologiques
            </p>
          </div>

          {/* Statistiques décoratives */}
          <div className="grid grid-cols-3 gap-6 pt-8 max-w-xl mx-auto">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
              <div className="text-3xl font-bold text-cyan-400">7+</div>
              <div className="text-sm text-blue-200/70">Pathologies</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
              <div className="text-3xl font-bold text-cyan-400">IA</div>
              <div className="text-sm text-blue-200/70">Assistée</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
              <div className="text-3xl font-bold text-cyan-400">24/7</div>
              <div className="text-sm text-blue-200/70">Disponible</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Droite - Formulaire de Connexion */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Carte de connexion */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-10 animate-float-card">
            {/* Barre d'accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 rounded-t-3xl"></div>

            {/* En-tête */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/30">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Connexion</h2>
              <p className="text-blue-200/70">Accédez à votre espace professionnel</p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-cyan-300 pl-1">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-blue-200/50 focus:outline-none focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all"
                    placeholder="docteur@exemple.com"
                    required
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-cyan-300 pl-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-blue-200/50 focus:outline-none focus:bg-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-200/70 hover:text-cyan-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Se souvenir & Mot de passe oublié */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-blue-200/70 group-hover:text-cyan-300 transition-colors">
                    Se souvenir de moi
                  </span>
                </label>
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                className="group relative w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden disabled:opacity-70 disabled:hover:translate-y-0"
                disabled={isSubmitting}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Connexion...' : 'Se connecter'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
              {errorMessage && (
                <div className="text-center text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}
            </form>

            {/* Pied de page */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-blue-200/70 text-sm">
                Pas encore de compte ?{' '}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
                  Contactez l'administrateur
                </a>
              </p>
            </div>
          </div>

          {/* Version mobile - Logo en haut */}
          <div className="lg:hidden text-center mt-8 space-y-3">
            <div className="flex items-center justify-center gap-2 text-cyan-300">
              <Stethoscope className="w-6 h-6" />
              <span className="text-lg font-semibold text-white">Diagnostic ORL</span>
            </div>
            <p className="text-blue-200/70 text-sm">Système Expert de Diagnostic</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-gradient { animation: gradient 15s ease infinite; background-size: 400% 400%; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-card { animation: float-card 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}