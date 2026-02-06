import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Edit, Image as ImageIcon, Lock, X, AlertCircle, UserCircle, Trash2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('mes-diagnostics'); // 'mes-diagnostics' ou 'disponibles'
  const [myDiagnostics, setMyDiagnostics] = useState([]);
  const [groupedImages, setGroupedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // Pour l'ajout d'un nouveau diagnostic
  const [modalMode, setModalMode] = useState('edit'); // 'edit' ou 'add'
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
  const currentUserId = currentUser?.id ? parseInt(currentUser.id) : null;

  // Récupérer MES diagnostics
  const fetchMyDiagnostics = useCallback(async () => {
    if (!currentUserId) return Promise.resolve();
    
    try {
      console.log(`🔄 Chargement des diagnostics pour user ${currentUserId}...`);
      const res = await axios.get(`${API_BASE_URL}/api/diagnostics/user/${currentUserId}?_t=${Date.now()}`);
      const rawData = res.data;
      console.log('📦 Mes diagnostics reçus:', rawData.length, 'diagnostics');
      
      // Grouper par image_hash
      const groups = rawData.reduce((acc, current) => {
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
      
      const groupsArray = Object.values(groups);
      setMyDiagnostics(groupsArray);
      console.log(`🔄 Mes diagnostics rechargés: ${groupsArray.length} images`);
    } catch (err) {
      console.error("❌ Erreur de chargement mes diagnostics:", err);
    }
  }, [currentUserId]);

  // Récupérer toutes les images pour les images disponibles
  const fetchImages = useCallback(async () => {
    try {
      console.log('🔄 Chargement de toutes les images...');
      const res = await axios.get(`${API_BASE_URL}/api/diagnostics?_t=${Date.now()}`);
      const rawData = res.data;
      console.log('📦 Données brutes reçues:', rawData.length, 'diagnostics');
      
      const groups = rawData.reduce((acc, current) => {
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

      const groupsArray = Object.values(groups);
      setGroupedImages(groupsArray);
      console.log(`🔄 Images disponibles rechargées: ${groupsArray.length} images`);
      
      // Afficher les détails de chaque groupe
      groupsArray.forEach(g => {
        console.log(`  📷 ${g.image_hash}: ${g.avis.length} avis - ${g.avis.map(a => a.medecin).join(', ')}`);
      });
      
    } catch (err) {
      console.error("❌ Erreur de chargement:", err);
    }
  }, []);

  useEffect(() => { 
    let mounted = true;
    
    const loadData = async () => {
      if (currentUserId && mounted) {
        await fetchMyDiagnostics();
        await fetchImages(); 
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [currentUserId, fetchMyDiagnostics, fetchImages]);

  const handleEditClick = (diagnostic) => {
    setModalMode('edit');
    setSelectedImage(diagnostic);
    setSelectedGroup(null);
    const isStandard = categoryOptions.some(c => c.name === diagnostic.nom_maladie);
    setNewDiseaseName(isStandard ? diagnostic.nom_maladie : 'Autre');
    setCustomDiseaseName(isStandard ? '' : diagnostic.nom_maladie);
    setNewDiseaseType(diagnostic.type_maladie);
    setPassword('');
    setError('');
    setStep(1);
    setShowModal(true);
  };

  const handleAddClick = (group) => {
    setModalMode('add');
    setSelectedImage(null);
    setSelectedGroup(group);
    setNewDiseaseName('OMA');
    setCustomDiseaseName('');
    setNewDiseaseType('');
    setPassword('');
    setError('');
    setStep(1);
    setShowModal(true);
  };

  const handleDeleteClick = (diagnostic) => {
    setDeleteTarget(diagnostic);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
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

      console.log('Vérification mot de passe pour utilisateur:', user.id);
      console.log('Mot de passe saisi:', password.trim());

      const verifData = {
        utilisateur_id: parseInt(user.id),
        mot_de_passe: password.trim()
      };

      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, verifData);
      console.log('Mot de passe vérifié avec succès');

      const finalName = newDiseaseName === 'Autre' ? customDiseaseName.trim() : newDiseaseName;

      if (modalMode === 'edit') {
        // Mode modification
        const updateData = {
          nom_maladie: finalName,
          type_maladie: newDiseaseType || 'Standard',
          utilisateur_id: parseInt(user.id)
        };

        await axios.put(`${API_BASE_URL}/api/diagnostic/${selectedImage.id}`, updateData);
      } else {
        // Mode ajout - créer un nouveau diagnostic en utilisant l'image existante
        const imageUrl = `${API_BASE_URL}/${selectedGroup.image_url}`;
        
        try {
          // Télécharger l'image
          const imageResponse = await axios.get(imageUrl, { responseType: 'blob' });
          const imageBlob = imageResponse.data;
          
          // Créer un fichier à partir du blob
          const fileName = selectedGroup.image_url.split('/').pop() || 'image.jpg';
          const imageFile = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' });

          const formData = new FormData();
          formData.append('file', imageFile);
          formData.append('nom_maladie', finalName);
          formData.append('type_maladie', newDiseaseType || 'Standard');
          formData.append('utilisateur_id', parseInt(user.id));
          formData.append('nom_medecin_diagnostiqueur', `${user.prenom} ${user.nom}`);

          await axios.post(`${API_BASE_URL}/api/diagnostic/`, formData);
          console.log('✅ Diagnostic ajouté avec succès');
        } catch (uploadError) {
          console.error('❌ Erreur upload:', uploadError);
          throw uploadError;
        }
      }

      // Fermer le modal immédiatement
      setShowModal(false);
      setIsRefreshing(true);
      
      // Réinitialiser les états pour forcer un re-render complet
      setGroupedImages([]);
      setMyDiagnostics([]);
      
      console.log('⏳ Attente du traitement backend...');
      
      // Attendre que le backend traite complètement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🔄 Rechargement complet des données...');
      
      // Recharger toutes les données - FORCER le rechargement
      await fetchImages();
      await fetchMyDiagnostics();
      
      // Attendre encore un peu pour être sûr que le state est mis à jour et le re-render effectué
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsRefreshing(false);
      console.log('✅ Rafraîchissement terminé - vérifiez les images violettes');
      
    } catch (e) {
      console.error('❌ Erreur lors de la validation:', e);
      console.error('Détails erreur:', e.response?.data);
      setError(e.response?.data?.detail || "Mot de passe incorrect ou erreur serveur.");
      setIsRefreshing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      setDeleteError("Aucun avis sélectionné.");
      return;
    }
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError("Le mot de passe est obligatoire.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        setDeleteError("Session expirée. Reconnectez-vous.");
        return;
      }

      const verifData = {
        utilisateur_id: parseInt(user.id),
        mot_de_passe: deletePassword.trim()
      };

      await axios.post(`${API_BASE_URL}/api/verifier-mdp`, verifData);

      await axios.delete(`${API_BASE_URL}/api/diagnostic/${deleteTarget.id}`, {
        data: { utilisateur_id: parseInt(user.id) }
      });

      // Fermer le modal
      setShowDeleteModal(false);
      setIsRefreshing(true);
      
      // Réinitialiser pour forcer le re-render
      setGroupedImages([]);
      setMyDiagnostics([]);
      
      // Attendre que le backend traite complètement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recharger toutes les données
      await fetchImages();
      await fetchMyDiagnostics();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsRefreshing(false);
      console.log('✅ Données rafraîchies après suppression');
      
    } catch (e) {
      setDeleteError(e.response?.data?.detail || "Mot de passe incorrect ou erreur serveur.");
      setIsRefreshing(false);
    }
  };

  const currentOptions = categoryOptions.find(c => c.name === newDiseaseName)?.options || [];

  const normalizeAvisValue = (value) => {
    if (!value) return '';
    return value.toString().trim().toLowerCase().split(/\s+/).join(' ');
  };

  const avisKey = (avis) => `${normalizeAvisValue(avis.nom_maladie)}::${normalizeAvisValue(avis.type_maladie)}`;

  const canAddAvis = (group) => {
    if (!currentUserId) {
      return false;
    }
    
    // Si l'avis est déjà validé (2+ avis concordants), on ne peut plus ajouter
    if (isValidated(group)) {
      return false;
    }
    
    const avisCount = group.avis.length;
    
    // Comparer les IDs en tant qu'entiers pour éviter les problèmes de type
    const hasUserAvis = group.avis.some(avi => parseInt(avi.utilisateur_id) === currentUserId);
    
    if (hasUserAvis) {
      console.log(`Image ${group.image_hash}: utilisateur ${currentUserId} a déjà donné un avis`);
      return false;
    }
    
    if (avisCount >= 3) {
      return false;
    }
    
    if (avisCount < 2) {
      console.log(`Image ${group.image_hash}: disponible pour ${currentUserId} (${avisCount} avis)`);
      return true;
    }
    
    const keys = new Set(group.avis.map(avisKey));
    const eligible = keys.size > 1;
    if (eligible) {
      console.log(`Image ${group.image_hash}: disponible pour ${currentUserId} (avis divergents)`);
    }
    return eligible;
  };

  const isConcordant = (group) => {
    if (group.avis.length < 2) return false;
    const keys = new Set(group.avis.map(avisKey));
    return keys.size === 1;
  };

  const isValidated = (group) => {
    // Un avis est validé si au moins 2 médecins ont le même diagnostic
    if (group.avis.length < 2) return false;
    const keys = new Set(group.avis.map(avisKey));
    const validated = keys.size === 1; // Tous les avis sont identiques
    if (validated) {
      console.log(`🟣 Image ${group.image_hash} VALIDÉE - ${group.avis.length} avis concordants:`, 
        group.avis.map(a => `${a.nom_maladie} (${a.medecin})`).join(', '));
    }
    return validated;
  };

  const eligibleGroups = groupedImages.filter(canAddAvis);
  const validatedGroups = groupedImages.filter(group => 
    isValidated(group) && !group.avis.some(a => parseInt(a.utilisateur_id) === currentUserId)
  );
  const allAvailableGroups = [...eligibleGroups, ...validatedGroups];
  
  // Log détaillé pour chaque image
  const validatedCount = groupedImages.filter(isValidated).length;
  console.log(`📊 Images - Total: ${groupedImages.length} | Disponibles: ${eligibleGroups.length} | Validées (total): ${validatedCount} | User: ${currentUserId}`);

  // Fonction pour afficher une carte d'image
  const renderImageCard = (group, keyValue, showActions = true) => {
    const validated = isValidated(group);
    const medecinsList = group.avis.map(a => `Dr. ${a.medecin}`).join(' & ');
    
    return (
      <div key={keyValue} className={`rounded-3xl overflow-hidden border flex flex-col shadow-2xl ${validated ? 'bg-purple-900/20 border-purple-500/30' : 'bg-white/10 border-white/10'}`}>
        <div className="h-56 bg-black relative">
          <img 
            src={`${API_BASE_URL}/${group.image_url}`} 
            className="w-full h-full object-cover" 
            alt="Otoscopie" 
            onError={(e) => {
              console.error("Erreur chargement image:", group.image_url);
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext fill='%23fff' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className={`absolute top-3 left-3 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase ${validated ? 'bg-purple-600' : 'bg-cyan-500'}`}>
            {group.avis.length} {group.avis.length > 1 ? 'Avis' : 'Avis'}
          </div>
          {activeTab === 'disponibles' && (
            <div className={`absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full font-bold uppercase ${validated ? 'bg-purple-600 text-white' : (isConcordant(group) ? 'bg-slate-700 text-slate-300' : 'bg-green-500 text-white')}`}>
              {validated ? '✓ Validé' : (isConcordant(group) ? 'Bloque' : 'Disponible')}
            </div>
          )}
          {validated && activeTab === 'mes-diagnostics' && (
            <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase">
              ✓ Validé
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col space-y-4">
          {validated ? (
            // Affichage pour avis validés - EN VIOLET
            <div className={`rounded-2xl p-4 border ${validated ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-purple-400 uppercase tracking-wide">Diagnostic Validé</span>
              </div>
              <div className="mb-4 p-3 bg-purple-600/10 rounded-lg border border-purple-500/20">
                <p className="text-xl font-bold text-purple-300 mb-1">{group.avis[0].nom_maladie}</p>
                <p className="text-sm text-purple-200 italic">{group.avis[0].type_maladie}</p>
              </div>
              <div className="pt-3 border-t border-purple-500/20">
                <p className="text-[10px] text-purple-400 font-bold uppercase mb-2 flex items-center gap-1">
                  <UserCircle size={12} />
                  Médecins concordants :
                </p>
                <div className="space-y-2">
                  {group.avis.map((avi, index) => (
                    <div key={avi.id} className="flex items-center justify-between bg-purple-500/5 p-2 rounded-lg">
                      <span className="text-sm text-purple-200 font-medium">Dr. {avi.medecin}</span>
                      <span className="text-[9px] text-purple-400">{avi.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Affichage normal pour avis non validés
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

                    {showActions && currentUserId === parseInt(avi.utilisateur_id) && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditClick(avi)}
                          className="p-2 bg-white/10 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(avi)}
                          className="p-2 bg-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton pour ajouter un avis (seulement dans Images Disponibles et si pas validé) */}
          {activeTab === 'disponibles' && !validated && (
            <button
              onClick={() => handleAddClick(group)}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Lock size={14} />
              Ajouter mon avis
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="w-8 h-8 text-cyan-400" />
          <h2 className="text-3xl font-bold">Galerie Collaborative</h2>
          {isRefreshing && (
            <div className="ml-auto flex items-center gap-2 bg-cyan-500/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-cyan-400">Actualisation...</span>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('mes-diagnostics')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'mes-diagnostics'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mes Diagnostics ({myDiagnostics.length})
          </button>
          <button
            onClick={() => setActiveTab('disponibles')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'disponibles'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Images Disponibles ({allAvailableGroups.length})
          </button>
        </div>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'mes-diagnostics' ? (
          myDiagnostics.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-12">Vous n'avez pas encore de diagnostics.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myDiagnostics.map((group) => renderImageCard(group, group.image_hash, true))}
            </div>
          )
        ) : (
          allAvailableGroups.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-12">Aucune image disponible pour un nouvel avis.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allAvailableGroups.map((group) => renderImageCard(group, group.image_hash, true))}
            </div>
          )
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="text-cyan-400" size={18} />
                {step === 1 ? (modalMode === 'edit' ? "Modifier mon avis" : "Ajouter mon avis") : "Signature Médicale"}
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
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    {modalMode === 'edit' 
                      ? `Modification pour Dr. ${selectedImage?.medecin}` 
                      : `Nouveau diagnostic par Dr. ${currentUser?.prenom} ${currentUser?.nom}`}
                  </p>
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
                  <button className="flex-1 py-3 bg-cyan-600 rounded-xl font-bold text-sm shadow-lg" onClick={handleConfirm}>
                    {modalMode === 'edit' ? 'Modifier' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-red-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-red-400" size={18} />
                Supprimer cet avis
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-[11px] text-red-200 mb-4">
              Êtes-vous sûr de supprimer cet avis ? Si vous continuez, il sera définitivement supprimé de la base de données.
            </div>

            <div>
              <label className="text-xs text-orange-400 font-bold uppercase">Mot de passe</label>
              <input
                type="password"
                className="w-full bg-slate-900 border border-orange-500/50 p-3 rounded-xl text-white mt-1 outline-none focus:border-orange-400"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Confirmer"
              />
            </div>

            {deleteError && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20 mt-3">{deleteError}</div>}

            <div className="flex gap-3 mt-4">
              <button className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-sm" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-sm shadow-lg" onClick={handleDeleteConfirm}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesImages;
