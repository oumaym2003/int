import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, Lock, X, AlertCircle, CheckCircle2, UserCircle } from 'lucide-react';

const categoryOptions = [
  { name: 'OMA', fullName: 'Otite Moyenne Aiguë', options: ['cong', 'sup', 'perf'] },
  { name: 'OSM', fullName: 'Otite Séromuqueuse', options: [] },
  { name: 'Perfo', fullName: 'Perforation', options: ['mag', 'Nmag'] },
  { name: 'Chole', fullName: 'Cholestéatome', options: ['attic', 'Post-sup', 'attic Post-sup'] },
  { name: 'PDR + Atel', fullName: 'Poche de Rétraction + Atélectasie', options: ['stade I', 'stade II', 'stade III'] },
  { name: 'Normal', fullName: 'Tympan Normal', options: [] },
  { name: 'Autre', fullName: 'Autre Pathologie', options: [] }
];

const MesImages = () => {
  const [groupedImages, setGroupedImages] = useState([]); // Contiendra les images groupées
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseType, setNewDiseaseType] = useState('');
  const [customDiseaseName, setCustomDiseaseName] = useState('');
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const API_BASE_URL = "http://127.0.0.1:8000";

  // --- LOGIQUE DE REGROUPEMENT ---
  const fetchImages = () => {
    axios.get(`${API_BASE_URL}/api/diagnostics`)
      .then(res => {
        const rawData = res.data;
        
        // On utilise un objet pour grouper par image_hash
        const groups = rawData.reduce((acc, current) => {
          const hash = current.image_hash;
          if (!acc[hash]) {
            acc[hash] = {
              image_url: current.image_url,
              image_hash: hash,
              avis: [] // Liste de tous les diagnostics pour cette image
            };
          }
          acc[hash].avis.push(current);
          return acc;
        }, {});

        // On transforme l'objet en tableau pour le map
        setGroupedImages(Object.values(groups));
      })
      .catch(err => console.error("Erreur de chargement:", err));
  };

  useEffect(() => { fetchImages(); }, []);

  const handleEditClick = (diagnostic) => {
    setSelectedImage(diagnostic);
    const isStandard = categoryOptions.some(c => c.name === diagnostic.nom_maladie);
    setNewDiseaseName(isStandard ? diagnostic.nom_maladie : 'Autre');
    setCustomDiseaseName(isStandard ? '' : diagnostic.nom_maladie);
    setNewDiseaseType(diagnostic.type_maladie);
    setPassword('');
    setError('');
    setStep(1);
    setShowModal(true);
  };

  const goToConfirmation = () => {
    if (newDiseaseName === 'Autre' && !customDiseaseName.trim()) {
      setError("Veuillez saisir le nom de la maladie.");
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirm = async () => {
    setError(''); 
    if (!password) {
      setError("Le mot de passe est obligatoire.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        setError("Session expirée. Reconnectez-vous.");
        return;
      }

      const verifData = {
        utilisateur_id: parseInt(user.id), 
        mot_de_passe: password.trim()
      };

      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, verifData);

      const finalName = newDiseaseName === 'Autre' ? customDiseaseName.trim() : newDiseaseName;
      const updateData = {
        nom_maladie: finalName,
        type_maladie: newDiseaseType || 'Standard'
      };

      // Utilisation de l'ID du diagnostic sélectionné
      await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.id}`, updateData);

      fetchImages();
      setShowModal(false);
    } catch (e) {
      setError(e.response?.data?.detail || "Mot de passe incorrect ou erreur serveur.");
    }
  };

  const currentOptions = categoryOptions.find(c => c.name === newDiseaseName)?.options || [];

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-10">
          <ImageIcon className="w-8 h-8 text-cyan-400" />
          <h2 className="text-3xl font-bold">Galerie Collaborative</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groupedImages.map((group, idx) => (
            <div key={idx} className="bg-white/10 rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl">
              {/* IMAGE UNIQUE */}
              <div className="h-56 bg-black relative">
                <img 
                  src={encodeURI(`${API_BASE_URL}/${group.image_url}`)} 
                  className="w-full h-full object-cover" 
                  alt="Otoscopie" 
                />
                <div className="absolute top-3 left-3 bg-cyan-500 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                  {group.avis.length} {group.avis.length > 1 ? 'Avis' : 'Avis'}
                </div>
              </div>

              {/* LISTE DES AVIS (MEDECINS) */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div className="space-y-3">
                  {group.avis.map(avi => (
                    <div key={avi.id} className="bg-white/5 rounded-2xl p-3 border border-white/5 relative group/item">
                      <div className="flex items-center gap-2 mb-1">
                        <UserCircle size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-300">Dr. {avi.medecin}</span>
                        <span className="text-[9px] text-slate-500 ml-auto">{avi.date}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-bold text-cyan-400">{avi.nom_maladie}</p>
                          <p className="text-[10px] text-slate-400 italic">{avi.type_maladie}</p>
                        </div>
                        
                        {/* Bouton modifier pour chaque avis spécifique */}
                        <button 
                          onClick={() => handleEditClick(avi)}
                          className="p-2 bg-white/10 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL (Identique mais utilise selectedImage.id pour le PUT) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="text-cyan-400" size={18} />
                {step === 1 ? "Modifier mon avis" : "Signature Médicale"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase">Maladie</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                    value={newDiseaseName}
                    onChange={(e) => {
                      setNewDiseaseName(e.target.value);
                      setNewDiseaseType(''); 
                    }}
                  >
                    {categoryOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {newDiseaseName === 'Autre' && (
                  <div>
                    <label className="text-xs text-orange-400 font-bold uppercase">Nom de la maladie</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-orange-500/30 p-3 rounded-xl text-white mt-1 outline-none focus:border-orange-400"
                      value={customDiseaseName}
                      onChange={(e) => setCustomDiseaseName(e.target.value)}
                      placeholder="Saisir..."
                    />
                  </div>
                )}

                {currentOptions.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Type / Stade</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                      value={newDiseaseType}
                      onChange={(e) => setNewDiseaseType(e.target.value)}
                    >
                      <option value="">Sélectionner...</option>
                      {currentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}

                <button className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold mt-4 transition-all shadow-lg" onClick={goToConfirmation}>
                  Vérifier
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Nouvel avis pour Dr. {selectedImage.medecin}</p>
                  <p className="text-lg font-bold text-white">{newDiseaseName === 'Autre' ? customDiseaseName : newDiseaseName}</p>
                  <p className="text-sm text-cyan-400">{newDiseaseType || 'Standard'}</p>
                </div>

                <div>
                  <label className="text-xs text-orange-400 font-bold uppercase">Mot de passe</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-900 border border-orange-500/50 p-3 rounded-xl text-white mt-1 outline-none focus:border-orange-400" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Confirmer" 
                  />
                </div>

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

                <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-sm" onClick={() => setStep(1)}>Retour</button>
                  <button className="flex-1 py-3 bg-cyan-600 rounded-xl font-bold text-sm shadow-lg" onClick={handleConfirm}>Enregistrer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;