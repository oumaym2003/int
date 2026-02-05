import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, FileImage, Stethoscope, CheckCircle2 } from 'lucide-react';

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
  const [dragActive, setDragActive] = useState(false);
  const [customDiseaseName, setCustomDiseaseName] = useState(''); // Pour le cas "Autre"
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(URL.createObjectURL(e.target.files[0]));
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedImage(URL.createObjectURL(e.dataTransfer.files[0]));
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    setIsSaving(true);
    setSaveMessage('');

    const userData = JSON.parse(localStorage.getItem('user'));
    const selectedCatName = Object.keys(selections).find(cat => selections[cat]?.checked);

    if (!selectedFile || !selectedCatName || !userData) {
      setSaveMessage("Erreur : Image, pathologie ou connexion manquante.");
      setIsSaving(false);
      return;
    }

    // --- LOGIQUE DES NOMS RACCOURCIS ---
    let finalDiseaseName = selectedCatName; // Par défaut : OMA, OSM, etc.
    
    if (selectedCatName === 'Autre') {
      if (!customDiseaseName) {
        setSaveMessage("Veuillez saisir le nom de la pathologie.");
        setIsSaving(false);
        return;
      }
      finalDiseaseName = customDiseaseName; // On prend ce que le médecin a écrit
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('nom_maladie', finalDiseaseName);
    formData.append('type_maladie', selections[selectedCatName]?.stage || 'Standard');
    formData.append('utilisateur_id', userData.id);
    formData.append('nom_medecin_diagnostiqueur', `${userData.prenom} ${userData.nom}`);

    try {
      await axios.post('http://127.0.0.1:8000/api/diagnostic/', formData);
      setSaveMessage('✅ Diagnostic enregistré avec succès !');
      setSelectedImage(null);
      setSelectedFile(null);
      setSelections({});
      setCustomDiseaseName('');
    } catch (e) {
      if (e.response && e.response.status === 400) {
        setSaveMessage(`⚠️ ${e.response.data.detail}`);
      } else {
        setSaveMessage("❌ Erreur serveur.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxChange = (catName, checked) => {
    const newSelections = {};
    if (checked) newSelections[catName] = { ...selections[catName], checked: true };
    setSelections(newSelections);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 animate-gradient"></div>
      
      <div className="relative w-full max-w-6xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 animate-float-card">
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Diagnostic ORL</h1>
          </div>
          <button className="px-5 py-2 bg-white/10 text-cyan-300 border border-cyan-400/30 rounded-xl font-semibold" onClick={() => navigate('/mes-images')}>
            Galerie
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Liste des Pathologies */}
          <div className="flex-1 space-y-4">
            {categoryOptions.map((cat, idx) => (
              <div key={idx} className={`p-4 border rounded-2xl transition-all ${selections[cat.name]?.checked ? 'border-cyan-400 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 text-white">
                    <div className="font-bold">{cat.name}</div>
                    <div className="text-[10px] opacity-60">{cat.fullName}</div>
                  </div>

                  {cat.name === 'Autre' && selections['Autre']?.checked && (
                    <input 
                      type="text" 
                      placeholder="Nom de la maladie..."
                      className="bg-slate-800 border border-cyan-500/50 rounded-lg px-3 py-1 text-sm text-white outline-none"
                      value={customDiseaseName}
                      onChange={(e) => setCustomDiseaseName(e.target.value)}
                    />
                  )}

                  {cat.options.length > 0 && (
                    <select 
                      className="bg-slate-800 text-white text-xs p-2 rounded-lg outline-none border border-white/20"
                      onChange={(e) => setSelections({...selections, [cat.name]: {...selections[cat.name], stage: e.target.value}})}
                      disabled={!selections[cat.name]?.checked}
                    >
                      <option value="">Stade...</option>
                      {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}

                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-cyan-400 cursor-pointer"
                    checked={selections[cat.name]?.checked || false}
                    onChange={(e) => handleCheckboxChange(cat.name, e.target.checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Section Upload */}
          <div className="flex-1">
            <div className={`border-2 border-dashed rounded-3xl p-10 text-center ${dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/20 bg-white/5'}`} onDragOver={handleDrag} onDrop={handleDrop}>
              <input id="up" type="file" className="hidden" onChange={handleImageChange} />
              {!selectedImage ? (
                <div onClick={() => document.getElementById('up').click()} className="cursor-pointer">
                  <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                  <p className="text-white font-bold">Cliquez ou glissez l'image ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={selectedImage} className="max-h-60 mx-auto rounded-xl shadow-xl" alt="Preview" />
                  <button className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold text-white shadow-lg" onClick={handleUpload} disabled={isSaving}>
                    {isSaving ? 'Enregistrement...' : 'VALIDER LE DIAGNOSTIC'}
                  </button>
                  <button className="text-xs text-slate-400" onClick={() => setSelectedImage(null)}>Changer l'image</button>
                </div>
              )}
              {saveMessage && (
                <div className={`mt-4 p-3 rounded-xl text-xs font-bold ${saveMessage.includes('succès') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
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