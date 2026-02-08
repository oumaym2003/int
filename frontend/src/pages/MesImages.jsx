import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, X, Trash2 } from 'lucide-react';
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
  const [allDataGrouped, setAllDataGrouped] = useState([]); // Une seule source de vérité
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); 
  const [modalMode, setModalMode] = useState('edit'); 
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseType, setNewDiseaseType] = useState('');
  const [customDiseaseName, setCustomDiseaseName] = useState('');

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const API_BASE_URL = "http://127.0.0.1:8000";
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  // --- LOGIQUE DE REGROUPEMENT UNIQUE ---
  const expandDiagnostics = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    const expanded = [];

    data.forEach((item) => {
      expanded.push({
        ...item,
        medecin: item.medecin,
        diagnostic_id: item.id,
        is_second: false
      });

      if (item.nom_medecin_diagnostiqueur_2 || item.diagnostique_2) {
        expanded.push({
          id: `${item.id}-2`,
          diagnostic_id: item.id,
          image_hash: item.image_hash,
          image_url: item.image_url,
          nom_maladie: item.diagnostique_2,
          type_maladie: item.type_maladie_2,
          medecin: item.nom_medecin_diagnostiqueur_2,
          utilisateur_id: item.utilisateur_id_2,
          is_second: true
        });
      }
    });

    return expanded;
  }, []);

  const groupData = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    const expanded = expandDiagnostics(data);
    const groups = expanded.reduce((acc, current) => {
      const hash = current.image_hash;
      if (!acc[hash]) {
        acc[hash] = {
          image_url: current.path_image_final || current.image_url,
          image_hash: hash,
          avis: []
        };
      }
      if (!acc[hash].avis.find(a => a.id === current.id)) {
        acc[hash].avis.push(current);
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [expandDiagnostics]);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/diagnostics?_t=${Date.now()}`);
      setAllDataGrouped(groupData(res.data));
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  }, [groupData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- FILTRES INTELLIGENTS ---
  const normalizeAvisValue = (value) => {
    if (!value) return '';
    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  };

  const normalizeTypeValue = (value) => {
    const normalized = normalizeAvisValue(value);
    return normalized || 'standard';
  };

  const avisKey = (avis) => `${normalizeAvisValue(avis.nom_maladie)}::${normalizeTypeValue(avis.type_maladie)}`;

  const getAvisStatus = (group) => {
    if (group.avis.length === 1) return 'single';
    const keys = new Set(group.avis.map(avisKey));
    return keys.size === 1 ? 'validated' : 'divergent';
  };

  // 1. Filtrer pour "Mes Diagnostics" : Images où l'utilisateur actuel a au moins un avis
  const myDiagnosticsGroups = useMemo(() => {
    return allDataGrouped.filter(group => 
      group.avis.some(avi => Number(avi.utilisateur_id) === currentUserId)
    );
  }, [allDataGrouped, currentUserId]);

  // 2. Filtrer pour "Contribuer" : Images où l'utilisateur n'a PAS encore donné d'avis ET pas encore validées
  const availableGroups = useMemo(() => {
    return allDataGrouped.filter(group => {
      const status = getAvisStatus(group);
      const userAlreadyVoted = group.avis.some(avi => Number(avi.utilisateur_id) === currentUserId);
      return !userAlreadyVoted && status !== 'validated';
    });
  }, [allDataGrouped, currentUserId]);


  // --- HANDLERS ---
  const handleEditClick = (diagnostic) => {
    setModalMode('edit');
    setSelectedImage(diagnostic);
    const isStandard = categoryOptions.some(c => c.name === diagnostic.nom_maladie);
    setNewDiseaseName(isStandard ? diagnostic.nom_maladie : 'Autre');
    setCustomDiseaseName(isStandard ? '' : diagnostic.nom_maladie);
    const rawType = diagnostic.type_maladie || '';
    setNewDiseaseType(normalizeTypeValue(rawType) === 'standard' ? '' : rawType);
    setPassword(''); setError(''); setStep(1); setShowModal(true);
  };

  const handleAddClick = (group) => {
    setModalMode('add');
    setSelectedGroup(group);
    setNewDiseaseName('OMA'); setCustomDiseaseName(''); setNewDiseaseType('');
    setPassword(''); setError(''); setStep(1); setShowModal(true);
  };

  const selectedCategory = categoryOptions.find(c => c.name === newDiseaseName);
  const stageOptions = selectedCategory?.options || [];
  const showStageSelect = stageOptions.length > 0;

  const handleConfirm = async () => {
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, {
        utilisateur_id: Number(currentUserId),
        mot_de_passe: password.trim()
      });

      const finalName = newDiseaseName === 'Autre' ? customDiseaseName : newDiseaseName;

      if (modalMode === 'edit') {
        await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.diagnostic_id || selectedImage.id}`, {
          nom_maladie: finalName,
          type_maladie: newDiseaseType || 'Standard',
          utilisateur_id: Number(currentUserId),
          is_second: Boolean(selectedImage.is_second)
        });
      } else {
        const formData = new FormData();
        formData.append('image_hash_existant', selectedGroup.image_hash);
        formData.append('nom_maladie', finalName);
        formData.append('type_maladie', newDiseaseType || 'Standard');
        formData.append('utilisateur_id', Number(currentUserId));
        formData.append('nom_medecin_diagnostiqueur', `${currentUser.prenom} ${currentUser.nom}`);
        await axios.post(`${API_BASE_URL}/api/diagnostic/`, formData);
      }

      setShowModal(false);
      setIsRefreshing(true);
      await fetchData();
      setIsRefreshing(false);
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur lors de la validation.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, {
        utilisateur_id: Number(currentUserId),
        mot_de_passe: deletePassword.trim()
      });
      await axios.delete(`${API_BASE_URL}/api/diagnostic/${deleteTarget.diagnostic_id || deleteTarget.id}`, {
        data: { utilisateur_id: Number(currentUserId), is_second: Boolean(deleteTarget.is_second) }
      });
      setShowDeleteModal(false);
      setIsRefreshing(true);
      await fetchData();
      setIsRefreshing(false);
    } catch (e) {
      setDeleteError("Mot de passe incorrect ou erreur serveur.");
    }
  };


  // --- RENDU ---
  const renderImageCard = (group) => {
    const status = getAvisStatus(group);
    const validated = status === 'validated';
    
    return (
      <div key={group.image_hash} className={`rounded-3xl overflow-hidden border flex flex-col shadow-xl bg-white/5 transition-all ${validated ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/10'}`}>
        <div className="h-48 bg-black relative">
          <img src={`${API_BASE_URL}/${group.image_url}`} className="w-full h-full object-cover" alt="Tympan" />
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold">
            {group.avis.length} AVIS
          </div>
          {validated && <div className="absolute top-2 right-2 bg-purple-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase italic shadow-lg">✓ Validé</div>}
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            {group.avis.map(avi => (
              <div key={avi.id} className={`flex justify-between items-center p-2 rounded-xl border ${Number(avi.utilisateur_id) === currentUserId ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/5 border-white/5'}`}>
                <div className="overflow-hidden">
                  <p className={`text-xs font-bold truncate ${Number(avi.utilisateur_id) === currentUserId ? 'text-cyan-400' : 'text-slate-300'}`}>{avi.nom_maladie}</p>
                  <p className="text-[10px] text-slate-500 italic">Dr. {avi.medecin}</p>
                </div>
                {Number(avi.utilisateur_id) === currentUserId && (
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleEditClick(avi)} className="p-1.5 hover:bg-cyan-500/20 rounded-lg text-cyan-400 transition-colors"><Edit size={14}/></button>
                    <button onClick={() => {setDeleteTarget(avi); setShowDeleteModal(true);}} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeTab === 'disponibles' && (
            <button onClick={() => handleAddClick(group)} className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs font-bold shadow-lg transition-all">
              Donner mon avis
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white font-sans selection:bg-cyan-500/30">
      <GlobalMenu />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/20"><ImageIcon className="text-cyan-400" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Galerie Collaborative</h1>
                    <p className="text-slate-400 text-xs">Suivi des diagnostics et consensus médical</p>
                </div>
            </div>
            {isRefreshing && <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse"><div className="w-2 h-2 bg-cyan-400 rounded-full"></div> Synchronisation...</div>}
        </div>

        <div className="flex gap-8 mb-8 border-b border-white/5">
          <button onClick={() => setActiveTab('mes-diagnostics')} className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'mes-diagnostics' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
            Mes Diagnostics ({myDiagnosticsGroups.length})
            {activeTab === 'mes-diagnostics' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>}
          </button>
          <button onClick={() => setActiveTab('disponibles')} className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'disponibles' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
            Contribuer ({availableGroups.length})
            {activeTab === 'disponibles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'mes-diagnostics' ? myDiagnosticsGroups : availableGroups).map(renderImageCard)}
        </div>
      </div>

      {/* MODAL AJOUT / EDITION */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">{step === 1 ? (modalMode === 'edit' ? "Modifier le diagnostic" : "Nouvel avis médical") : "Vérification de sécurité"}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {step === 1 ? (
              <div className="space-y-5">
                <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Pathologie identifiée</label>
                    <select
                      value={newDiseaseName}
                      onChange={e => {
                        setNewDiseaseName(e.target.value);
                        setNewDiseaseType('');
                      }}
                      className="w-full bg-slate-900 mt-1.5 p-3 rounded-xl border border-white/10 outline-none focus:border-cyan-500/50 transition-all"
                    >
                    {categoryOptions.map(c => <option key={c.name} value={c.name}>{c.fullName}</option>)}
                    </select>
                </div>
                {newDiseaseName === 'Autre' && (
                  <input value={customDiseaseName} onChange={e => setCustomDiseaseName(e.target.value)} placeholder="Précisez la pathologie..." className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 outline-none focus:border-cyan-500/50 transition-all" />
                )}
                {showStageSelect && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase ml-1">Type / Stade</label>
                    <select
                      value={newDiseaseType}
                      onChange={e => setNewDiseaseType(e.target.value)}
                      className="w-full bg-slate-900 mt-1.5 p-3 rounded-xl border border-white/10 outline-none focus:border-cyan-500/50 transition-all"
                    >
                      <option value="">Type...</option>
                      {stageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={() => setStep(2)} className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-bold mt-2 shadow-lg transition-all">Suivant</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 px-1">Veuillez saisir votre mot de passe pour confirmer l'action.</p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 outline-none focus:border-cyan-500/50 transition-all" autoFocus />
                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] animate-shake">{error}</div>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-2xl font-bold text-sm transition-all">Retour</button>
                  <button onClick={handleConfirm} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-bold text-sm transition-all">Confirmer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-red-500/20 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-red-400">Supprimer cet avis ?</h3>
            <p className="text-xs text-slate-400 mb-6">Votre expertise sera retirée de cette image. Si vous étiez le dernier votant, l'image pourrait redevenir "À contribuer".</p>
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Mot de passe de confirmation" className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 outline-none focus:border-red-500/50 mb-4" />
            {deleteError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px]">{deleteError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-700 rounded-2xl font-bold text-sm">Annuler</button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-sm transition-all">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;