import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, Lock } from 'lucide-react';

const MesImages = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseType, setNewDiseaseType] = useState('');
  const [password, setPassword] = useState(''); // État pour le mot de passe
  const [error, setError] = useState('');

  const API_BASE_URL = "http://127.0.0.1:8000";

  const fetchImages = () => {
    axios.get(`${API_BASE_URL}/api/diagnostics`)
      .then(res => setImages(res.data))
      .catch(() => setImages([]));
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleEditClick = (image) => {
    setSelectedImage(image);
    setNewDiseaseName(image.nom_maladie);
    setNewDiseaseType(image.type_maladie);
    setPassword(''); // On vide le mot de passe à chaque ouverture
    setError('');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!password) {
      setError("Le mot de passe est obligatoire pour modifier.");
      return;
    }

    try {
      // 1. Récupérer l'ID de l'utilisateur (depuis le localStorage)
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.id;

      // 2. Vérification du mot de passe via l'API
      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, {
        utilisateur_id: userId,
        mot_de_passe: password
      });

      // 3. Si OK, on fait la mise à jour réelle
      await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.id}`, {
        nom_maladie: newDiseaseName,
        type_maladie: newDiseaseType
      });

      fetchImages();
      setShowModal(false);
    } catch (e) {
      // Si l'erreur vient du mot de passe (401) ou autre
      setError(e.response?.data?.detail || "Accès refusé ou erreur serveur");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
        
        <div className="flex items-center gap-3 mb-10">
          <ImageIcon className="w-8 h-8 text-cyan-400" />
          <h2 className="text-3xl font-bold">Galerie des Diagnostics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {images.map(img => (
            <div key={img.id} className="bg-white/10 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/50 transition-all group">
              <img 
                src={`${API_BASE_URL}${img.image_url}`} 
                alt={img.nom_maladie}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-4">
                <h3 className="text-cyan-400 font-bold text-lg">{img.nom_maladie}</h3>
                <p className="text-slate-300 text-sm">Type : {img.type_maladie}</p>
                <p className="text-slate-400 text-xs mt-2 italic">Par Dr. {img.medecin}</p>
                
                <button 
                  onClick={() => handleEditClick(img)}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 py-2 rounded-lg transition-colors font-medium"
                >
                  <Edit size={16} /> Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale de Modification Sécurisée */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Lock className="text-cyan-400" size={20} /> Validation Requise
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Maladie</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                  value={newDiseaseName}
                  onChange={e => setNewDiseaseName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Type / Stade</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white mt-1 outline-none focus:border-cyan-400"
                  value={newDiseaseType}
                  onChange={e => setNewDiseaseType(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-slate-700">
                <label className="text-xs text-orange-400 uppercase font-bold">Votre mot de passe</label>
                <input
                  type="password"
                  placeholder="Saisir pour confirmer"
                  className="w-full bg-slate-900 border border-orange-500/50 p-3 rounded-xl text-white mt-1 outline-none focus:border-orange-400"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

              <div className="flex gap-3 pt-4">
                <button 
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all text-sm"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button 
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold text-sm transition-all"
                  onClick={handleConfirm}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;