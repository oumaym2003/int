import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, Trash2, CheckCircle, X } from 'lucide-react';
import GlobalMenu from '../components/GlobalMenu';

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
  const [activeTab, setActiveTab] = useState('mes-diagnostics');
  const [allDataGrouped, setAllDataGrouped] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); 
  const [modalMode, setModalMode] = useState('edit'); 
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [newDiseaseName, setNewDiseaseName] = useState('OMA');
  const [newDiseaseType, setNewDiseaseType] = useState('Standard');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const API_BASE_URL = "http://127.0.0.1:8000";
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  const expandAndGroupData = (data) => {
    if (!Array.isArray(data)) return [];
    const expanded = [];
    data.forEach((item) => {
      expanded.push({
        ...item,
        medecin: item.nom_medecin_diagnostiqueur,
        diagnostic_id: item.id,
        utilisateur_id: item.utilisateur_id ? Number(item.utilisateur_id) : null,
        is_second: false,
        display_nom: item.nom_maladie
      });
      if (item.nom_medecin_diagnostiqueur_2 && item.nom_medecin_diagnostiqueur_2 !== "NULL") {
        expanded.push({
          id: `${item.id}-2`,
          diagnostic_id: item.id,
          image_hash: item.image_hash,
          image_url: item.image_url,
          path_image_final: item.path_image_final,
          medecin: item.nom_medecin_diagnostiqueur_2,
          utilisateur_id: item.utilisateur_id_2 ? Number(item.utilisateur_id_2) : null,
          is_second: true,
          display_nom: item.diagnostique_2 || item.nom_maladie,
          nom_maladie: item.diagnostique_2 || item.nom_maladie,
          type_maladie: item.type_maladie_2 || item.type_maladie
        });
      }
    });

    const groups = expanded.reduce((acc, current) => {
      const hash = current.image_hash;
      if (!acc[hash]) {
        acc[hash] = {
          image_url: current.path_image_final || current.image_url,
          image_hash: hash,
          avis: []
        };
      }
      acc[hash].avis.push(current);
      return acc;
    }, {});
    return Object.values(groups);
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/diagnostics?_t=${Date.now()}`);
      setAllDataGrouped(expandAndGroupData(res.data));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const getAvisStatus = (group) => {
    if (group.avis.length < 2) return 'pending';

    const counts = group.avis.reduce((acc, avis) => {
      const key = avis.display_nom || '';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    if (group.avis.length === 2) {
      return maxCount === 2 ? 'validated' : 'divergent';
    }
    return maxCount >= 2 ? 'validated' : 'divergent';
  };

  const myGroups = allDataGrouped.filter(g => g.avis.some(a => Number(a.utilisateur_id) === currentUserId));
  const availableGroups = allDataGrouped.filter(g => !g.avis.some(a => Number(a.utilisateur_id) === currentUserId) && getAvisStatus(g) !== 'validated');

  const handleEditClick = (avi) => {
    setModalMode('edit');
    setSelectedImage(avi);
    setNewDiseaseName(avi.nom_maladie || 'OMA');
    setNewDiseaseType(avi.type_maladie || 'Standard');
    setStep(1); setPassword(''); setError(''); setShowModal(true);
  };

  const handleConfirmAction = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, {
        utilisateur_id: currentUserId, mot_de_passe: password.trim()
      });

      if (modalMode === 'edit') {
        await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.diagnostic_id}`, {
          nom_maladie: newDiseaseName,
          type_maladie: newDiseaseType,
          utilisateur_id: currentUserId,
          is_second: selectedImage.is_second
        });
      } else {
        const formData = new FormData();
        formData.append('image_hash_existant', selectedGroup.image_hash);
        formData.append('nom_maladie', newDiseaseName);
        formData.append('type_maladie', newDiseaseType);
        formData.append('utilisateur_id', currentUserId);
        formData.append('nom_medecin_diagnostiqueur', `${currentUser.prenom} ${currentUser.nom}`);
        await axios.post(`${API_BASE_URL}/api/diagnostic/`, formData);
      }
      setShowModal(false); fetchData();
    } catch (e) { setError("Mot de passe incorrect."); }
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, {
        utilisateur_id: currentUserId, mot_de_passe: deletePassword.trim()
      });
      await axios.delete(`${API_BASE_URL}/api/diagnostic/${deleteTarget.diagnostic_id}`, {
        data: { utilisateur_id: currentUserId, is_second: deleteTarget.is_second }
      });
      setShowDeleteModal(false); fetchData();
    } catch (e) { setDeleteError("Erreur mot de passe."); }
  };

  // Trouver les options du type en fonction de la maladie choisie dans la modale
  const currentCategory = categoryOptions.find(c => c.name === newDiseaseName);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <GlobalMenu />
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <ImageIcon className="text-cyan-400" size={30} />
            <h1 className="text-2xl font-bold uppercase tracking-widest italic">Ma Galerie</h1>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('mes-diagnostics')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'mes-diagnostics' ? 'bg-cyan-500 shadow-lg' : 'text-slate-500'}`}>MES DIAGNOSTICS</button>
            <button onClick={() => setActiveTab('disponibles')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'disponibles' ? 'bg-cyan-500 shadow-lg' : 'text-slate-500'}`}>CONTRIBUER</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(activeTab === 'mes-diagnostics' ? myGroups : availableGroups).map(group => {
            const status = getAvisStatus(group);
            return (
              <div key={group.image_hash} className={`relative bg-slate-800 rounded-[2.5rem] overflow-hidden border transition-all ${status === 'validated' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : status === 'divergent' ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-white/5'}`}>
                
                <div className="relative h-56">
                  <img src={`${API_BASE_URL}/${group.image_url}`} className="w-full h-full object-cover" alt="Tympan" />
                  
                  {/* COMPTEUR D'AVIS */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{group.avis.length} Avis</span>
                  </div>

                  {/* BADGE VIOLET VALIDÉ */}
                  {status === 'validated' && (
                    <div className="absolute top-4 right-4 bg-purple-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                      <CheckCircle size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase text-white">Validé</span>
                    </div>
                  )}

                  {/* BADGE ROUGE NON VALIDÉ (3E AVIS) */}
                  {status === 'divergent' && (
                    <div className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                      <X size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase text-white">Non validé (vérifier)</span>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-3">
                  {group.avis.map((avi, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${avi.utilisateur_id === currentUserId ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900 border-transparent'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-cyan-400 uppercase tracking-wider">{avi.display_nom}</p>
                          <p className="text-[10px] text-slate-500 italic mt-1">Dr. {avi.medecin}</p>
                        </div>
                        {avi.utilisateur_id === currentUserId && (
                          <div className="flex gap-2">
                            <button onClick={() => handleEditClick(avi)} className="p-2 text-slate-400 hover:text-white transition-colors"><Edit size={14}/></button>
                            <button onClick={() => handleDeleteClick(avi)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {activeTab === 'disponibles' && (
                    <button onClick={() => { setSelectedGroup(group); setModalMode('add'); setShowModal(true); }} className="w-full py-4 mt-2 bg-cyan-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-900/20">Donner mon avis</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODALE D'ÉDITION / AJOUT AVEC SÉLECTEUR DE TYPES */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-white/10">
            <h2 className="text-xl font-black mb-8 text-center uppercase tracking-tighter">{step === 1 ? "Modifier le Diagnostic" : "Sécurité"}</h2>
            
            {step === 1 ? (
              <div className="space-y-6">
                {/* CHOIX DE LA MALADIE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pathologie</label>
                  <select value={newDiseaseName} onChange={(e) => { setNewDiseaseName(e.target.value); setNewDiseaseType('Standard'); }} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50">
                    {categoryOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.fullName}</option>)}
                  </select>
                </div>

                {/* CHOIX DU TYPE (DYNAMIQUE) */}
                {currentCategory && currentCategory.options.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Type / Stade</label>
                    <select value={newDiseaseType} onChange={(e) => setNewDiseaseType(e.target.value)} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50">
                      <option value="Standard">Standard</option>
                      {currentCategory.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}

                <button onClick={() => setStep(2)} className="w-full py-5 bg-cyan-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Suivant</button>
                <button onClick={() => setShowModal(false)} className="w-full text-slate-500 text-[10px] font-bold uppercase">Annuler</button>
              </div>
            ) : (
              <div className="space-y-6">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50" autoFocus />
                {error && <p className="text-red-400 text-center text-[10px] font-bold uppercase">{error}</p>}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-700 rounded-2xl font-black uppercase text-xs">Retour</button>
                  <button onClick={handleConfirmAction} className="flex-1 py-5 bg-cyan-600 rounded-2xl font-black uppercase text-xs">Valider</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-red-500/20">
            <h2 className="text-xl font-black text-red-500 mb-8 text-center uppercase">Confirmer Suppression</h2>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-red-500/50" />
            {deleteError && <p className="text-red-400 text-xs text-center mt-3 font-bold">{deleteError}</p>}
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-700 rounded-2xl font-black uppercase text-xs">Annuler</button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-5 bg-red-600 rounded-2xl font-black uppercase text-xs">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;