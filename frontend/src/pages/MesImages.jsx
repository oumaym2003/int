import React, { useEffect, useState } from 'react';
import { Edit, Image as ImageIcon, Trash2, CheckCircle, X } from 'lucide-react';
import GlobalMenu from '../components/GlobalMenu';
import { supabase } from '../supabaseClient';

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
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchDoctor, setSearchDoctor] = useState(''); 

  // Récupération sécurisée de l'utilisateur
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  const groupData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    const groups = data.reduce((acc, current) => {
      const hash = current.image_hash;
      if (!acc[hash]) {
        acc[hash] = {
          image_url: current.image_url,
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
    const { data, error } = await supabase
      .from('categories_diagnostics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur Fetch:", error.message);
    } else {
      setAllDataGrouped(groupData(data));
    }
  };

  useEffect(() => { 
    if (currentUserId) fetchData(); 
  }, [currentUserId]);

  const getAvisStatus = (group) => {
    if (group.avis.length < 2) return 'pending';
    const counts = group.avis.reduce((acc, avis) => {
      const key = avis.maladie_nom || '';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const maxCount = Math.max(...Object.values(counts));
    return maxCount >= 2 ? 'validated' : 'divergent';
  };

  // Filtrage robuste des groupes
  const myGroups = allDataGrouped.filter(g => 
    g.avis.some(a => Number(a.utilisateur_id) === currentUserId)
  );
  
  const availableGroups = allDataGrouped.filter(g => 
    !g.avis.some(a => Number(a.utilisateur_id) === currentUserId) && 
    getAvisStatus(g) !== 'validated'
  );

  const filteredData = (activeTab === 'mes-diagnostics' ? myGroups : availableGroups).filter(group => {
    return group.avis.some(avi => {
      const diseaseMatch = searchTerm === '' || avi.maladie_nom === searchTerm;
      const doctorMatch = searchDoctor === '' || avi.nom_medecin_diagnostiqueur === searchDoctor;
      return diseaseMatch && doctorMatch;
    });
  });

  const verifyPassword = async (pwd) => {
    if (!currentUser?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: pwd
    });
    return !error;
  };

  const resetModalState = () => {
    setPassword('');
    setError('');
    setStep(1);
  };

  const handleEditClick = (avi) => {
    setSelectedImage(avi);
    setSelectedGroup(null);
    setModalMode('edit');
    setNewDiseaseName(avi.maladie_nom || 'OMA');
    setNewDiseaseType(avi.stade_nom || 'Standard');
    resetModalState();
    setShowModal(true);
  };

  const handleDeleteClick = (avi) => {
    setDeleteTarget(avi);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmAction = async () => {
    setError("");
    const isValid = await verifyPassword(password.trim());
    if (!isValid) { setError("Mot de passe incorrect."); return; }

    if (modalMode === 'edit') {
      const { error } = await supabase
        .from('categories_diagnostics')
        .update({ 
          maladie_nom: newDiseaseName, 
          stade_nom: newDiseaseType 
        })
        .eq('id', selectedImage.id);
      if (error) console.error("Erreur Update:", error.message);
    } else {
      const { error } = await supabase
        .from('categories_diagnostics')
        .insert([{
          image_hash: selectedGroup.image_hash,
          image_url: selectedGroup.image_url,
          maladie_nom: newDiseaseName,
          stade_nom: newDiseaseType,
          utilisateur_id: currentUserId,
          nom_medecin_diagnostiqueur: `${currentUser.prenom} ${currentUser.nom}`
        }]);
      if (error) console.error("Erreur Insert:", error.message);
    }
    setShowModal(false); 
    fetchData();
  };

  const handleDeleteConfirm = async () => {
    setDeleteError("");
    const isValid = await verifyPassword(deletePassword.trim());
    if (!isValid) { setDeleteError("Mot de passe incorrect."); return; }

    const { error } = await supabase
      .from('categories_diagnostics')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      setDeleteError("Erreur de suppression.");
    } else {
      setShowDeleteModal(false); 
      fetchData();
    }
  };

  // --- RENDU ---
  const currentCategory = categoryOptions.find(c => c.name === newDiseaseName);
  const uniqueDiseases = categoryOptions.map(cat => cat.name);
  const uniqueDoctors = [...new Set(allDataGrouped.flatMap(group => group.avis.map(avi => avi.nom_medecin_diagnostiqueur)))].filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <GlobalMenu />
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <ImageIcon className="text-cyan-400" size={30} />
            <h1 className="text-2xl font-bold uppercase tracking-widest italic">DIAGNOSTICS</h1>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={() => setActiveTab('mes-diagnostics')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'mes-diagnostics' ? 'bg-cyan-500 shadow-lg text-white' : 'text-slate-500'}`}>MES DIAGNOSTICS</button>
            <button onClick={() => setActiveTab('disponibles')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'disponibles' ? 'bg-cyan-500 shadow-lg text-white' : 'text-slate-500'}`}>CONTRIBUER</button>
          </div>
        </header>

        {/* FILTRES */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Filtrer par Maladie</label>
            <select className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-cyan-500/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}>
              <option value="">Toutes les pathologies</option>
              {uniqueDiseases.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-1 block">Filtrer par Médecin</label>
            <select className="w-full bg-slate-800 border border-white/5 p-4 rounded-2xl text-xs font-bold outline-none focus:border-cyan-500/50" value={searchDoctor} onChange={(e) => setSearchDoctor(e.target.value)}>
              <option value="">Tous les médecins</option>
              {uniqueDoctors.map(doc => <option key={doc} value={doc}>Dr. {doc}</option>)}
            </select>
          </div>
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredData.map(group => {
            const status = getAvisStatus(group);
            return (
              <div key={group.image_hash} className={`relative bg-slate-800 rounded-[2.5rem] overflow-hidden border transition-all ${status === 'validated' ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : status === 'divergent' ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-white/5'}`}>
                <div className="relative h-56">
                  <img src={group.image_url} className="w-full h-full object-cover" alt="Tympan" loading="lazy" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {status === 'validated' && <span className="bg-purple-600 px-3 py-1 rounded-full text-[8px] font-bold uppercase shadow-lg">Validé</span>}
                    {status === 'divergent' && <span className="bg-red-600 px-3 py-1 rounded-full text-[8px] font-bold uppercase shadow-lg">Divergent</span>}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  {group.avis.map((avi) => (
                    <div key={avi.id} className={`p-4 rounded-2xl border transition-colors ${Number(avi.utilisateur_id) === currentUserId ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900 border-transparent'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-cyan-400 uppercase tracking-tight">{avi.maladie_nom} {avi.stade_nom && avi.stade_nom !== 'Standard' ? `(${avi.stade_nom})` : ''}</p>
                          <p className="text-[10px] text-slate-500 italic mt-1 font-medium">Dr. {avi.nom_medecin_diagnostiqueur}</p>
                        </div>
                        {Number(avi.utilisateur_id) === currentUserId && (
                          <div className="flex gap-1">
                            <button onClick={() => handleEditClick(avi)} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"><Edit size={14}/></button>
                            <button onClick={() => handleDeleteClick(avi)} className="p-2 text-red-400/50 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeTab === 'disponibles' && (
                    <button onClick={() => { setSelectedGroup(group); setModalMode('add'); setShowModal(true); setStep(1); }} className="w-full py-4 mt-2 bg-cyan-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 shadow-lg transition-all active:scale-95">Donner mon avis</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODALE ÉDITION / AJOUT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-white/10 shadow-2xl">
            <h2 className="text-xl font-black mb-8 text-center uppercase tracking-tighter">
              {step === 1 ? (modalMode === 'edit' ? "Modifier l'avis" : "Contribuer") : "Validation"}
            </h2>
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pathologie</label>
                  <select value={newDiseaseName} onChange={(e) => { setNewDiseaseName(e.target.value); setNewDiseaseType('Standard'); }} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50">
                    {categoryOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.fullName}</option>)}
                  </select>
                </div>
                {currentCategory?.options.length > 0 && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Stade / Type</label>
                    <select value={newDiseaseType} onChange={(e) => setNewDiseaseType(e.target.value)} className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50">
                      <option value="Standard">Standard</option>
                      {currentCategory.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={() => setStep(2)} className="w-full py-5 bg-cyan-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-cyan-500 transition-colors">Continuer</button>
                <button onClick={() => setShowModal(false)} className="w-full text-slate-500 text-[10px] font-bold uppercase mt-4 hover:text-white transition-colors">Annuler</button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-[10px] text-slate-400 text-center uppercase font-bold px-4">Veuillez saisir votre mot de passe pour confirmer l'action</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-cyan-500/50 text-center" autoFocus />
                {error && <p className="text-red-400 text-center text-[10px] font-bold uppercase animate-bounce">{error}</p>}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-slate-600 transition-colors">Retour</button>
                  <button onClick={handleConfirmAction} className="flex-1 py-5 bg-cyan-600 rounded-2xl font-black uppercase text-xs hover:bg-cyan-500 transition-colors">Valider</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm border border-red-500/20 shadow-2xl">
            <h2 className="text-xl font-black text-red-500 mb-8 text-center uppercase">Supprimer ?</h2>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Confirmer mot de passe" className="w-full bg-slate-900 p-4 rounded-2xl border border-white/5 outline-none focus:border-red-500/50 text-center" autoFocus />
            {deleteError && <p className="text-red-400 text-xs text-center mt-3 font-bold uppercase">{deleteError}</p>}
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-5 bg-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-slate-600 transition-colors">Non</button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-5 bg-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Oui, Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;