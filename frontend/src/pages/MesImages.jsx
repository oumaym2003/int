/*import React, { useEffect, useState } from 'react';
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

  const [searchTerm, setSearchTerm] = useState(''); // Pour le nom de la maladie
  const [searchDoctor, setSearchDoctor] = useState(''); // Pour le nom du médecin
  const expandAndGroupData = (data) => {
    if (!Array.isArray(data)) return [];
    const expanded = [];
    
    data.forEach((item) => {
      // PREMIER AVIS
      expanded.push({
        ...item,
        // On utilise le nom exact de votre colonne BDD
        medecin: item.nom_medecin_diagnostiqueur || "Inconnu", 
        diagnostic_id: item.id,
        utilisateur_id: item.utilisateur_id ? Number(item.utilisateur_id) : null,
        is_second: false,
        display_nom: item.nom_maladie
      });

      // DEUXIÈME AVIS (si présent)
      if (item.nom_medecin_diagnostiqueur_2 && item.nom_medecin_diagnostiqueur_2 !== "NULL") {
        expanded.push({
          ...item, // On garde les infos de base (image_hash, etc.)
          id: `${item.id}-2`,
          diagnostic_id: item.id,
          // On utilise la deuxième colonne de votre BDD
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

  const handleDeleteClick = (avi) => {
    setDeleteTarget(avi);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
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

  // Fonction de filtrage globale
  const filterGroups = (groups) => {
    return groups.filter(group => {
      // On vérifie si n'importe quel avis dans le groupe correspond aux filtres
      const matchesSearch = group.avis.some(avi => {
        const diseaseMatch = avi.display_nom?.toLowerCase().includes(searchTerm.toLowerCase());
        const doctorMatch = avi.medecin?.toLowerCase().includes(searchDoctor.toLowerCase());
        
        // On filtre par maladie ET par médecin si les deux sont remplis
        return (searchTerm === '' || diseaseMatch) && (searchDoctor === '' || doctorMatch);
      });
      return matchesSearch;
    });
  };

  // Application du filtre selon l'onglet actif
  const filteredData = filterGroups(activeTab === 'mes-diagnostics' ? myGroups : availableGroups);
  // Trouver les options du type en fonction de la maladie choisie dans la modale
  const currentCategory = categoryOptions.find(c => c.name === newDiseaseName);
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <GlobalMenu />
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER }
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

          {/* --- BARRE DE FILTRAGE (AJOUTÉE ICI) --- }
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <input 
                type="text"
                placeholder="Rechercher une maladie (ex: OSM, OMA...)"
                className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl outline-none focus:border-cyan-500/50 text-xs font-bold uppercase tracking-widest transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <input 
                type="text"
                placeholder="Rechercher un médecin..."
                className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl outline-none focus:border-cyan-500/50 text-xs font-bold uppercase tracking-widest transition-all"
                value={searchDoctor}
                onChange={(e) => setSearchDoctor(e.target.value)}
              />
            </div>
          </div>

          {/* GRID D'IMAGES }
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Utilisez filteredData ici au lieu du filtrage brut }
            {filteredData.map(group => {
              const status = getAvisStatus(group);
              return (
                <div key={group.image_hash} className={`relative bg-slate-800 rounded-[2.5rem] overflow-hidden border transition-all ${status === 'validated' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : status === 'divergent' ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-white/5'}`}>
                  
                  <div className="relative h-56">
                    <img src={`${API_BASE_URL}/${group.image_url}`} className="w-full h-full object-cover" alt="Tympan" />
                    
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{group.avis.length} Avis</span>
                    </div>

                    {status === 'validated' && (
                      <div className="absolute top-4 right-4 bg-purple-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                        <CheckCircle size={14} className="text-white" />
                        <span className="text-[10px] font-black uppercase text-white">Validé</span>
                      </div>
                    )}

                    {status === 'divergent' && (
                      <div className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                        <X size={14} className="text-white" />
                        <span className="text-[10px] font-black uppercase text-white">Non validé</span>
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
  
      {/* MODALE D'ÉDITION / AJOUT AVEC SÉLECTEUR DE TYPES }
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-white/10">
            <h2 className="text-xl font-black mb-8 text-center uppercase tracking-tighter">{step === 1 ? "Modifier le Diagnostic" : "Sécurité"}</h2>
            
            {step === 1 ? (
              <div className="space-y-6">
                {/* CHOIX DE LA MALADIE }
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pathologie</label>
                  <select value={newDiseaseName} onChange={(e) => { setNewDiseaseName(e.target.value); setNewDiseaseType('Standard'); }} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50">
                    {categoryOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.fullName}</option>)}
                  </select>
                </div>

                {/* CHOIX DU TYPE (DYNAMIQUE) }
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

      {/* MODALE SUPPRESSION }
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
*/

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
  // --- ÉTATS ---
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

  // États pour le filtrage
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchDoctor, setSearchDoctor] = useState(''); 

  const API_BASE_URL = "http://127.0.0.1:8000";
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  // --- LOGIQUE DE DONNÉES ---
  const expandAndGroupData = (data) => {
    if (!Array.isArray(data)) return [];
    const expanded = [];
    
    data.forEach((item) => {
      // Premier Avis
      expanded.push({
        ...item,
        medecin: item.nom_medecin_diagnostiqueur || "Inconnu", 
        diagnostic_id: item.id,
        utilisateur_id: item.utilisateur_id ? Number(item.utilisateur_id) : null,
        is_second: false,
        display_nom: item.nom_maladie
      });

      // Deuxième Avis
      if (item.nom_medecin_diagnostiqueur_2 && item.nom_medecin_diagnostiqueur_2 !== "NULL") {
        expanded.push({
          ...item,
          id: `${item.id}-2`,
          diagnostic_id: item.id,
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

  // --- CALCULS DES FILTRES ---
  const uniqueDiseases = categoryOptions.map(cat => cat.name);
  const uniqueDoctors = [...new Set(allDataGrouped.flatMap(group => 
    group.avis.map(avi => avi.medecin)
  ))].filter(Boolean).sort();

  const getAvisStatus = (group) => {
    if (group.avis.length < 2) return 'pending';
    const counts = group.avis.reduce((acc, avis) => {
      const key = avis.display_nom || '';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const maxCount = Math.max(...Object.values(counts));
    return maxCount >= 2 ? 'validated' : 'divergent';
  };

  const myGroups = allDataGrouped.filter(g => g.avis.some(a => Number(a.utilisateur_id) === currentUserId));
  const availableGroups = allDataGrouped.filter(g => !g.avis.some(a => Number(a.utilisateur_id) === currentUserId) && getAvisStatus(g) !== 'validated');

  const filteredData = (activeTab === 'mes-diagnostics' ? myGroups : availableGroups).filter(group => {
    return group.avis.some(avi => {
      const diseaseMatch = searchTerm === '' || (avi.display_nom && avi.display_nom.includes(searchTerm));
      const doctorMatch = searchDoctor === '' || avi.medecin === searchDoctor;
      return diseaseMatch && doctorMatch;
    });
  });

  // --- ACTIONS ---
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

  const handleDeleteClick = (avi) => {
    setDeleteTarget(avi);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
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

  const currentCategory = categoryOptions.find(c => c.name === newDiseaseName);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <GlobalMenu />
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <ImageIcon className="text-cyan-400" size={30} />
            <h1 className="text-2xl font-bold uppercase tracking-widest italic">DIAGNOSTICS</h1>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5">
            <button onClick={() => { setActiveTab('mes-diagnostics'); setSearchTerm(''); setSearchDoctor(''); }} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'mes-diagnostics' ? 'bg-cyan-500 shadow-lg' : 'text-slate-500'}`}>MES DIAGNOSTICS</button>
            <button onClick={() => { setActiveTab('disponibles'); setSearchTerm(''); setSearchDoctor(''); }} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'disponibles' ? 'bg-cyan-500 shadow-lg' : 'text-slate-500'}`}>CONTRIBUER</button>
          </div>
        </header>

        {/* BARRE DE FILTRAGE */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Filtrer par Maladie</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl outline-none focus:border-cyan-500/50 text-xs font-bold uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            >
              <option value="">Toutes les pathologies</option>
              {uniqueDiseases.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Filtrer par Médecin</label>
            <select 
              className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl outline-none focus:border-cyan-500/50 text-xs font-bold uppercase tracking-widest"
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
            >
              <option value="">Tous les médecins</option>
              {uniqueDoctors.map(doc => <option key={doc} value={doc}>Dr. {doc}</option>)}
            </select>
          </div>
        </div>

        {/* GRILLE D'IMAGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredData.map(group => {
            const status = getAvisStatus(group);
            return (
              <div key={group.image_hash} className={`relative bg-slate-800 rounded-[2.5rem] overflow-hidden border transition-all ${status === 'validated' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : status === 'divergent' ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-white/5'}`}>
                <div className="relative h-56">
                  <img src={`${API_BASE_URL}/${group.image_url}`} className="w-full h-full object-cover" alt="Tympan" />
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{group.avis.length} Avis</span>
                  </div>
                  {status === 'validated' && (
                    <div className="absolute top-4 right-4 bg-purple-600 px-4 py-2 rounded-full flex items-center gap-2">
                      <CheckCircle size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase text-white">Validé</span>
                    </div>
                  )}
                  {status === 'divergent' && (
                    <div className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2">
                      <X size={14} className="text-white" />
                      <span className="text-[10px] font-black uppercase text-white">Divergent</span>
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
                    <button onClick={() => { setSelectedGroup(group); setModalMode('add'); setShowModal(true); setStep(1); }} className="w-full py-4 mt-2 bg-cyan-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Donner mon avis</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODALE ÉDITION / AJOUT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-white/10">
            <h2 className="text-xl font-black mb-8 text-center uppercase tracking-tighter">
              {step === 1 ? (modalMode === 'edit' ? "Modifier" : "Nouvel Avis") : "Sécurité"}
            </h2>
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pathologie</label>
                  <select value={newDiseaseName} onChange={(e) => { setNewDiseaseName(e.target.value); setNewDiseaseType('Standard'); }} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none">
                    {categoryOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.fullName}</option>)}
                  </select>
                </div>
                {currentCategory && currentCategory.options.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Type / Stade</label>
                    <select value={newDiseaseType} onChange={(e) => setNewDiseaseType(e.target.value)} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none">
                      <option value="Standard">Standard</option>
                      {currentCategory.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={() => setStep(2)} className="w-full py-5 bg-cyan-600 rounded-2xl font-black uppercase text-xs tracking-widest">Suivant</button>
                <button onClick={() => setShowModal(false)} className="w-full text-slate-500 text-[10px] font-bold uppercase mt-4">Annuler</button>
              </div>
            ) : (
              <div className="space-y-6">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none" autoFocus />
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
            <h2 className="text-xl font-black text-red-500 mb-8 text-center uppercase">Supprimer ?</h2>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none" />
            {deleteError && <p className="text-red-400 text-xs text-center mt-3 font-bold uppercase">{deleteError}</p>}
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