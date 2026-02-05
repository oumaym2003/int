import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Stethoscope, X, ChevronRight } from 'lucide-react';

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

    const userData = JSON.parse(localStorage.getItem('user'));
    const selectedKeys = Object.keys(selections).filter(k => selections[k].checked);

    if (!selectedFile || selectedKeys.length === 0 || !userData) {
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
    formData.append('file', selectedFile);
    formData.append('nom_maladie', names.join(' + ')); 
    formData.append('type_maladie', types.join(' / ')); 
    formData.append('utilisateur_id', userData.id);
    formData.append('nom_medecin_diagnostiqueur', `${userData.prenom} ${userData.nom}`);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/diagnostic/', formData);
      
      // On affiche le message renvoyé par le serveur (Nouveau ou Avis ajouté)
      setSaveMessage(`✅ ${response.data.message}`);
      
      // Reset du formulaire
      setSelectedImage(null);
      setSelectedFile(null);
      setSelections({});
      setCustomDiseaseName('');
    } catch (e) {
      // Si le backend renvoie 400 (déjà diagnostiqué), on l'affiche proprement
      setSaveMessage(e.response?.data?.detail || "❌ Erreur serveur.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 animate-gradient"></div>
      
      <div className="relative w-full max-w-6xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Diagnostic ORL <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md ml-2">Collaboratif</span></h1>
          </div>
          <button className="px-5 py-2 bg-white/10 text-cyan-300 border border-cyan-400/30 rounded-xl font-semibold hover:bg-white/20 transition-all" onClick={() => navigate('/mes-images')}>
            Galerie
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sélectionnez les pathologies observées</p>
            {categoryOptions.map((cat, idx) => (
              <div key={idx} className={`p-4 border rounded-2xl transition-all duration-300 ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 text-white">
                    <div className="font-bold text-sm">{cat.name}</div>
                    <div className="text-[9px] opacity-50 uppercase tracking-tighter">{cat.fullName}</div>
                  </div>

                  {cat.name === 'Autre' && selections['Autre'] && (
                    <input 
                      type="text" placeholder="Nom..."
                      className="bg-slate-800 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-white outline-none w-24 animate-scale-in"
                      value={customDiseaseName}
                      onChange={(e) => setCustomDiseaseName(e.target.value)}
                    />
                  )}

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
                      <p className="text-xs text-slate-500 mt-2">Glissez le fichier ou cliquez ici</p>
                      <input id="up" type="file" className="hidden" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative group">
                      <img src={selectedImage} className="max-h-64 mx-auto rounded-2xl shadow-2xl border border-white/20" alt="Preview" />
                      <button onClick={() => {setSelectedImage(null); setSelectedFile(null)}} className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                    </div>
                  )}
                </div>

                {Object.keys(selections).length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-scale-in">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase mb-3">Diagnostic Combiné :</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(selections).map(key => (
                        <span key={key} className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs border border-cyan-500/30">
                          {key === 'Autre' ? customDiseaseName : key} ({selections[key].stage || 'Standard'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 ${Object.keys(selections).length > 0 && selectedFile ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 hover:scale-[1.02]' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}
                  onClick={handleUpload} 
                  disabled={isSaving || Object.keys(selections).length === 0}
                >
                  {isSaving ? 'Traitement...' : 'VALIDER LE DIAGNOSTIC'}
                  {!isSaving && <ChevronRight size={20}/>}
                </button>

                {saveMessage && (
                  <div className={`p-4 rounded-2xl text-xs font-bold text-center ${saveMessage.includes('✅') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {saveMessage}
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