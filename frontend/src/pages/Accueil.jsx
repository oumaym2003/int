import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Stethoscope, X, ChevronRight, MessageSquarePlus, ChevronLeft } from 'lucide-react';
import GlobalMenu from '../components/GlobalMenu';

const categoryOptions = [
  { name: 'OMA', fullName: 'Otite Moyenne Aiguë', options: ['cong', 'sup', 'perf'], icon: '🔴' },
  { name: 'OSM', fullName: 'Otite Séromuqueuse', options: [], icon: '🟡' },
  { name: 'Perfo', fullName: 'Perforation', options: ['mag', 'Nmag'], icon: '🔵' },
  { name: 'Chole', fullName: 'Cholestéatome', options: ['attic', 'Post-sup', 'attic Post-sup'], icon: '🟣' },
  { name: 'PDR + Atel', fullName: 'Poche de Rétraction + Atélectasie', options: ['stade I', 'stade II', 'stade III'], icon: '🟠' },
  { name: 'Normal', fullName: 'Tympan Normal', options: [], icon: '🟢' },
  { name: 'Autre', fullName: 'Autre Pathologie', options: [], icon: '⚪' }
];

export default function Accueil() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selections, setSelections] = useState({}); 
  const [customDiseaseName, setCustomDiseaseName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  const API_BASE_URL = "http://127.0.0.1:8000";
  const userData = JSON.parse(localStorage.getItem('user') || '{}');

  // Charger le carousel
  const fetchCarousel = () => {
    if (userData.id) {
      axios.get(`${API_BASE_URL}/api/suggestions-carousel/${userData.id}`)
        .then(res => setSuggestions(res.data))
        .catch(err => console.error("Erreur carousel:", err));
    }
  };

  useEffect(() => {
    fetchCarousel();
  }, [userData.id]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(URL.createObjectURL(e.target.files[0]));
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCheckboxChange = (catName, checked) => {
    setSelections(prev => {
      const newMap = { ...prev };
      if (checked) {
        newMap[catName] = { checked: true, stage: '' };
      } else {
        delete newMap[catName];
      }
      return newMap;
    });
  };

  const updateStage = (catName, stage) => {
    setSelections(prev => ({
      ...prev,
      [catName]: { ...prev[catName], stage: stage }
    }));
  };

  const handleUpload = async () => {
    setIsSaving(true);
    setSaveMessage('');

    const selectedKeys = Object.keys(selections).filter(k => selections[k].checked);

    if (!selectedFile || selectedKeys.length === 0 || !userData.id) {
      setSaveMessage("Erreur : Image, pathologie(s) ou connexion manquante.");
      setIsSaving(false);
      return;
    }

    const names = [];
    const types = [];

    selectedKeys.forEach(key => {
      const name = key === 'Autre' ? customDiseaseName : key;
      const type = selections[key].stage || 'Standard';
      if (name) {
        names.push(name);
        types.push(type);
      }
    });

    const formData = new FormData();
    // On envoie le fichier (le nom du fichier servira d'identifiant pour le backend)
    formData.append('file', selectedFile);
    formData.append('nom_maladie', names.join(' + ')); 
    formData.append('type_maladie', types.join(' / ')); 
    formData.append('utilisateur_id', userData.id);
    formData.append('nom_medecin_diagnostiqueur', `${userData.prenom} ${userData.nom}`);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/diagnostic/`, formData);
      setSaveMessage(`✅ ${response.data.message}`);
      
      // Reset formulaire
      setSelectedImage(null);
      setSelectedFile(null);
      setSelections({});
      setCustomDiseaseName('');
      
      // Rafraîchir le carousel pour faire disparaître l'image traitée
      fetchCarousel();
    } catch (e) {
      setSaveMessage(e.response?.data?.detail || "❌ Erreur serveur.");
    } finally {
      setIsSaving(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150?text=Pas+d'image";
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-5 relative overflow-x-hidden bg-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 animate-gradient"></div>

      <GlobalMenu />
      
      {/* SECTION CAROUSEL CORRIGÉE */}
      {suggestions.length > 0 && (
        <div className="relative w-full max-w-6xl mb-8 mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquarePlus className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Cas nécessitant votre expertise</h2>
          </div>
          
          <div className="relative flex items-center justify-between gap-4">
            <button 
              onClick={() => setCurrentCarouselIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)}
              className="p-3 bg-white/10 rounded-full hover:bg-cyan-500 transition-all"
            >
              <ChevronLeft className="text-white" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-10 bg-black/20 p-6 rounded-2xl">
              <img 
                src={encodeURI(getFullImageUrl(suggestions[currentCarouselIndex].image_url || suggestions[currentCarouselIndex].path_image_final))} 
                className="h-48 rounded-xl border border-white/10 shadow-xl object-cover aspect-video"
                alt="Cas à expertiser"
                onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Erreur+Lien"; }}
              />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Avis actuel sur ce cas :</p>
                <p className="text-xl font-bold text-cyan-400 mt-1">{suggestions[currentCarouselIndex].nom_maladie}</p>
                
                <button 
                  onClick={async () => {
                    try {
                      const item = suggestions[currentCarouselIndex];
                      const path = item.image_url || item.path_image_final;
                      const url = getFullImageUrl(path);
                      
                      const response = await fetch(url);
                      const blob = await response.blob();
                      
                      // ON RÉCUPÈRE LE NOM ORIGINAL DU FICHIER SUR LE SERVEUR
                      const originalFileName = path.split('/').pop();
                      const file = new File([blob], originalFileName, { type: "image/jpeg" });
                      
                      setSelectedFile(file);
                      setSelectedImage(URL.createObjectURL(file));
                      
                      // Scroll vers le formulaire de diagnostic
                      window.scrollTo({ top: 550, behavior: 'smooth' });
                    } catch (err) {
                      alert("Erreur de récupération de l'image.");
                    }
                  }}
                  className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white text-sm font-bold transition-all"
                >
                  Expertiser ce cas
                </button>
              </div>
            </div>

            <button 
              onClick={() => setCurrentCarouselIndex(prev => (prev + 1) % suggestions.length)}
              className="p-3 bg-white/10 rounded-full hover:bg-cyan-500 transition-all"
            >
              <ChevronRight className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION DIAGNOSTIC */}
      <div className="relative w-full max-w-6xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Diagnostic ORL <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md ml-2">Collaboratif</span></h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sélectionnez les pathologies</p>
            {categoryOptions.map((cat, idx) => (
              <div key={idx} className={`p-4 border rounded-2xl transition-all duration-300 ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 text-white">
                    <div className="font-bold text-sm">{cat.name}</div>
                    <div className="text-[9px] opacity-50 uppercase tracking-tighter">{cat.fullName}</div>
                  </div>
                  {cat.options.length > 0 && (
                    <select 
                      className={`bg-slate-800 text-white text-[10px] p-2 rounded-lg border transition-all ${selections[cat.name] ? 'border-cyan-500' : 'border-white/10 opacity-30'}`}
                      onChange={(e) => updateStage(cat.name, e.target.value)}
                      value={selections[cat.name]?.stage || ''}
                      disabled={!selections[cat.name]}
                    >
                      <option value="">Type...</option>
                      {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  <input 
                    type="checkbox" 
                    className="w-6 h-6 accent-cyan-400 cursor-pointer"
                    checked={!!selections[cat.name]}
                    onChange={(e) => handleCheckboxChange(cat.name, e.target.checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1">
            <div className="sticky top-0 space-y-6">
                <div className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/20 bg-white/5'}`}
                     onDragOver={(e) => {e.preventDefault(); setDragActive(true)}} 
                     onDragLeave={() => setDragActive(false)}
                     onDrop={(e) => {e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]){ setSelectedFile(e.dataTransfer.files[0]); setSelectedImage(URL.createObjectURL(e.dataTransfer.files[0])); }}}>
                  
                  {!selectedImage ? (
                    <label htmlFor="up" className="cursor-pointer block">
                      <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-bounce-slow" />
                      <p className="text-white font-bold">Importer l'otoscopie</p>
                      <input id="up" type="file" className="hidden" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative group">
                      <img src={selectedImage} className="max-h-64 mx-auto rounded-2xl shadow-2xl border border-white/20" alt="Preview" />
                      <button onClick={() => {setSelectedImage(null); setSelectedFile(null)}} className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full text-white shadow-lg"><X size={16}/></button>
                    </div>
                  )}
                </div>

                <button 
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 ${Object.keys(selections).length > 0 && selectedFile ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}
                  onClick={handleUpload} 
                  disabled={isSaving || Object.keys(selections).length === 0}
                >
                  {isSaving ? 'Traitement...' : 'VALIDER LE DIAGNOSTIC'}
                  {!isSaving && <ChevronRight size={20}/>}
                </button>

                {saveMessage && (
                  <div className={`p-4 rounded-2xl text-xs font-bold text-center ${saveMessage.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {saveMessage}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-gradient { animation: gradient 15s ease infinite; background-size: 400% 400%; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}