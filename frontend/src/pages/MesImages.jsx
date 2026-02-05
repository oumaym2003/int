import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, Lock, X, AlertCircle, CheckCircle2 } from 'lucide-react';

// Structure des maladies identique à l'accueil pour la cohérence
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
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // États pour la nouvelle sélection
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseType, setNewDiseaseType] = useState('');
  const [customDiseaseName, setCustomDiseaseName] = useState('');
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Sélection, 2: Récapitulatif/MDP

  const API_BASE_URL = "http://127.0.0.1:8000";

  const fetchImages = () => {
    axios.get(`${API_BASE_URL}/api/diagnostics`)
      .then(res => setImages(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchImages(); }, []);

  const handleEditClick = (image) => {
    setSelectedImage(image);
    setNewDiseaseName(image.nom_maladie);
    setNewDiseaseType(image.type_maladie);
    setCustomDiseaseName(categoryOptions.some(c => c.name === image.nom_maladie) ? '' : image.nom_maladie);
    setPassword('');
    setError('');
    setStep(1);
    setShowModal(true);
  };

  const goToConfirmation = () => {
    if (newDiseaseName === 'Autre' && !customDiseaseName) {
      setError("Veuillez saisir le nom de la maladie.");
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirm = async () => {
    setError(''); // Réinitialiser l'erreur au début
    
    if (!password) {
      setError("Le mot de passe est obligatoire pour signer la modification.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      // Sécurité : Vérifier si l'utilisateur et l'ID existent
      if (!user || !user.id) {
        setError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      // 1. Vérification du mot de passe
      // On s'assure que utilisateur_id est bien un nombre si ton backend l'attend ainsi
      const verifData = {
        utilisateur_id: parseInt(user.id), 
        mot_de_passe: password
      };

      console.log("Tentative de vérification :", verifData);

      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, verifData);

      // 2. Si la vérification passe, on prépare le nom final
      const finalName = newDiseaseName === 'Autre' ? customDiseaseName : newDiseaseName;

      // 3. Mise à jour réelle
      const updateData = {
        nom_maladie: finalName,
        type_maladie: newDiseaseType || 'Standard'
      };

      console.log("Envoi de la mise à jour :", updateData);

      await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.id}`, updateData);

      // Succès
      fetchImages();
      setShowModal(false);
      setPassword(''); // Nettoyer le mdp
    } catch (e) {
      console.error("Erreur complète :", e);
      
      // Gestion fine du message d'erreur
      if (e.response) {
        // Le serveur a répondu avec une erreur (ex: 401 ou 400)
        setError(e.response.data.detail || "Mot de passe incorrect ou erreur de validation.");
      } else if (e.request) {
        // Pas de réponse du serveur
        setError("Le serveur ne répond pas. Vérifiez votre connexion.");
      } else {
        setError("Une erreur est survenue lors de l'envoi.");
      }
    }
  };
 
  // Trouver les options de type pour la maladie sélectionnée
  const currentOptions = categoryOptions.find(c => c.name === newDiseaseName)?.options || [];

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-10">
          <ImageIcon className="w-8 h-8 text-cyan-400" />
          <h2 className="text-3xl font-bold">Images diagnostiquées</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {images.map(img => (
            <div key={img.id} className="bg-white/10 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/50 transition-all">
              <img src={encodeURI(`${API_BASE_URL}/${img.image_url}`)} className="w-full h-48 object-cover" alt="" />
              <div className="p-4">
                <h3 className="text-cyan-400 font-bold">{img.nom_maladie}</h3>
                <p className="text-slate-400 text-xs">Type: {img.type_maladie}</p>
                <button onClick={() => handleEditClick(img)} className="w-full mt-4 flex items-center justify-center gap-2 bg-cyan-600 py-2 rounded-lg text-sm font-bold">
                  <Edit size={14} /> Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {step === 1 ? "Nouveau Diagnostic" : "Signature Médicale"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                {/* Menu déroulant Maladie */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase">Maladie</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                    value={categoryOptions.some(c => c.name === newDiseaseName) ? newDiseaseName : 'Autre'}
                    onChange={(e) => {
                      setNewDiseaseName(e.target.value);
                      setNewDiseaseType(''); // Reset du type si on change de maladie
                    }}
                  >
                    {categoryOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {/* Champ si "Autre" est sélectionné */}
                {newDiseaseName === 'Autre' && (
                  <div>
                    <label className="text-xs text-orange-400 font-bold uppercase">Nom personnalisé</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-orange-500/30 p-3 rounded-xl text-white mt-1 outline-none focus:border-orange-400"
                      value={customDiseaseName}
                      onChange={(e) => setCustomDiseaseName(e.target.value)}
                      placeholder="Saisir la pathologie..."
                    />
                  </div>
                )}

                {/* Menu déroulant Type (si options disponibles) */}
                {currentOptions.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase">Type / Stade</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                      value={newDiseaseType}
                      onChange={(e) => setNewDiseaseType(e.target.value)}
                    >
                      <option value="">Sélectionner un type...</option>
                      {currentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}

                <button className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold mt-4 transition-all" onClick={goToConfirmation}>
                  Vérifier la modification
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-blue-400 shrink-0" size={20} />
                  <p className="text-[11px] text-blue-100 italic">
                    Note : L'image source originale est conservée. Le diagnostic sera modifié par le nouveau ci-dessous.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Nouveau Diagnostic</span>
                    <CheckCircle2 size={14} className="text-green-400" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {newDiseaseName === 'Autre' ? customDiseaseName : newDiseaseName}
                  </p>
                  <p className="text-sm text-cyan-400">{newDiseaseType || 'Standard'}</p>
                </div>

                <div>
                  <label className="text-xs text-orange-400 font-bold uppercase">Mot de passe pour confirmer</label>
                  <input type="password" className="w-full bg-slate-900 border border-orange-500/50 p-3 rounded-xl text-white mt-1 outline-none" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

                <div className="flex gap-3 pt-2">
                  <button className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-sm" onClick={() => setStep(1)}>Retour</button>
                  <button className="flex-1 py-3 bg-gradient-to-r from-green-600 to-cyan-600 rounded-xl font-bold text-sm" onClick={handleConfirm}>Confirmer</button>
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