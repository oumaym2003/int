import React, { useState } from 'react';
import { Upload, FileImage, Stethoscope, CheckCircle2 } from 'lucide-react';

const categoryOptions = [
  { name: 'OMA', fullName: 'Otite Moyenne Aiguë', options: ['stade I', 'stade II', 'stade III', 'stade IV'], icon: '🔴' },
  { name: 'OSM', fullName: 'Otite Séromuqueuse', options: [], icon: '🟡' },
  { name: 'Perfo', fullName: 'Perforation', options: ['mag', 'Nmag'], icon: '🔵' },
  { name: 'Chole', fullName: 'Cholestéatome', options: ['attic', 'post', 'sup'], icon: '🟣' },
  { name: 'PDR + Atel', fullName: 'Poche de Rétraction + Atélectasie', options: ['stade I', 'stade II'], icon: '🟠' },
  { name: 'Normal', fullName: 'Tympan Normal', options: [], icon: '🟢' },
  { name: 'Autre', fullName: 'Autre Pathologie', options: [], icon: '⚪' }
];

export default function Accueil() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selections, setSelections] = useState({});
  const [dragActive, setDragActive] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedImage(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  const handleCheckboxChange = (catName, checked) => {
    setSelections(prev => ({
      ...prev,
      [catName]: { ...prev[catName], checked }
    }));
  };

  const handleSelectChange = (catName, value) => {
    setSelections(prev => ({
      ...prev,
      [catName]: { ...prev[catName], stage: value }
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      {/* Background animé */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 animate-gradient"></div>
      {/* Particules médicales */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-blue-400 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-cyan-300 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-blue-300 rounded-full animate-float-delayed"></div>
      </div>
      {/* Carte principale */}
      <div className="relative w-full max-w-6xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-12 animate-float-card">
        {/* Barre d'accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 rounded-t-3xl"></div>
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-8">
          <Stethoscope className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">Diagnostic ORL</h1>
        </div>
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Section gauche - Formulaire */}
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-semibold text-cyan-300 mb-6">Pathologies Otologiques</h2>
            {categoryOptions.map((cat, idx) => (
              <div 
                key={idx}
                className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 hover:translate-x-1"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-lg">{cat.name}</div>
                    <div className="text-xs text-blue-200/70">{cat.fullName}</div>
                  </div>
                  {cat.options.length > 0 && (
                    <select 
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:bg-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer"
                      onChange={(e) => handleSelectChange(cat.name, e.target.value)}
                      value={selections[cat.name]?.stage || ''}
                    >
                      <option value="" className="bg-slate-800">Sélectionner...</option>
                      {cat.options.map((opt, i) => (
                        <option key={i} value={opt} className="bg-slate-800">{opt}</option>
                      ))}
                    </select>
                  )}
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-lg cursor-pointer accent-cyan-400 hover:scale-110 transition-transform"
                      checked={selections[cat.name]?.checked || false}
                      onChange={(e) => handleCheckboxChange(cat.name, e.target.checked)}
                    />
                    {selections[cat.name]?.checked && (
                      <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-green-400 animate-scale-in pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Section droite - Upload d'image */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-cyan-300 mb-6 self-start">Image Otoscopique</h2>
            <div 
              className={`w-full border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
                dragActive 
                  ? 'border-cyan-400 bg-cyan-400/10 scale-105' 
                  : 'border-white/30 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {!selectedImage ? (
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Upload className="w-16 h-16 text-cyan-400 animate-bounce-slow" />
                  </div>
                  <button 
                    className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <FileImage className="w-5 h-5" />
                      Choisir une image
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  </button>
                  <p className="mt-4 text-sm text-blue-200/70">ou glissez-déposez une image ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative group">
                    <img 
                      src={selectedImage} 
                      alt="Aperçu otoscopique" 
                      className="w-full max-h-96 rounded-xl border-2 border-cyan-400/30 shadow-2xl object-contain transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
                  </div>
                  <button 
                    className="w-full px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 hover:border-cyan-400/50 transition-all"
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    Changer l'image
                  </button>
                </div>
              )}
            </div>
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
          50% { transform: translateY(-10px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-gradient { animation: gradient 15s ease infinite; background-size: 400% 400%; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-card { animation: float-card 6s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
