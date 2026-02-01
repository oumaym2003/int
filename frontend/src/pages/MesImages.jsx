import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Stethoscope, Image as ImageIcon } from 'lucide-react';

const MesImages = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'rename' or 'delete'
  const [password, setPassword] = useState('');
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    axios.get('/api/mes-images', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => setImages(res.data))
      .catch(() => setImages([]));
  }, []);

  const handleImageClick = (image, type) => {
    setSelectedImage(image);
    setActionType(type);
    setShowModal(true);
    setError('');
    setPassword('');
    setNewDiseaseName(type === 'rename' ? image.diseaseName : '');
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedImage(null);
    setActionType('');
    setPassword('');
    setNewDiseaseName('');
    setError('');
  };

  const handleConfirm = async () => {
    if (!selectedImage?.id) {
      setError('ID image manquant');
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      if (actionType === 'delete') {
        await axios.post('/api/supprimer-image', {
          imageId: selectedImage.id,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setImages(images.filter(img => img.id !== selectedImage.id));
      } else if (actionType === 'rename') {
        await axios.post('/api/renommer-image', {
          imageId: selectedImage.id,
          newDiseaseName,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setImages(images.map(img => img.id === selectedImage.id ? { ...img, diseaseName: newDiseaseName } : img));
      }
      handleModalClose();
    } catch (e) {
      setError('Erreur serveur: ' + (e?.response?.data?.detail || e.message));
    }
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
          <ImageIcon className="w-8 h-8 text-cyan-400" />
          <h2 className="text-3xl font-bold text-white">Mes images enregistrées</h2>
        </div>

        {/* Grille d'images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {images.length === 0 ? (
            <div className="col-span-3 text-center text-blue-200 text-lg">Aucune image enregistrée pour le moment.</div>
          ) : images.map(image => (
            <div key={image.id} className="bg-white/20 border border-white/20 rounded-2xl shadow-lg p-5 flex flex-col items-center hover:bg-white/30 transition-all">
              <img src={image.url} alt={image.diseaseName} className="w-48 h-48 object-cover rounded-xl mb-3 border-2 border-cyan-400/30 shadow group-hover:scale-105 transition-all cursor-pointer" onClick={() => handleImageClick(image, 'rename')} />
              <div className="font-semibold text-white mb-1">Ajouté par : <span className="text-cyan-300">{image.ownerName}</span></div>
              <div className="mb-2 text-blue-100">Maladie : <span className="font-semibold text-cyan-200">{image.diseaseName}</span></div>
              <div className="flex gap-2 mt-2">
                <button className="px-4 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium shadow transition-all" onClick={() => handleImageClick(image, 'rename')}>Renommer</button>
                <button className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow transition-all" onClick={() => handleImageClick(image, 'delete')}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale de confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white/90 p-8 rounded-2xl shadow-2xl w-96 border-t-4 border-cyan-400 animate-float-card">
            <h3 className="text-xl font-bold mb-4 text-cyan-700 flex items-center gap-2">
              {actionType === 'delete' ? 'Supprimer' : 'Renommer'} l'image
            </h3>
            {actionType === 'rename' && (
              <input
                type="text"
                className="border p-2 w-full mb-2 rounded"
                value={newDiseaseName}
                onChange={e => setNewDiseaseName(e.target.value)}
                placeholder="Nouveau nom de maladie"
              />
            )}
            <input
              type="password"
              className="border p-2 w-full mb-2 rounded"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
            />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-4 py-1 bg-gray-300 hover:bg-gray-400 rounded-lg" onClick={handleModalClose}>Annuler</button>
              <button className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={handleConfirm}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Animations CSS */}
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
        .animate-gradient { animation: gradient 15s ease infinite; background-size: 400% 400%; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-card { animation: float-card 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default MesImages;
