import React, { useState, useEffect } from 'react';
import { Upload, Activity, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import GlobalMenu from '../components/GlobalMenu';
import { supabase } from '../supabaseClient'; 

const categoryOptions = [
  { name: 'OMA', fullName: 'Otite Moyenne Aiguë', options: ['Congestive', 'Suppurée', 'Perforée'], icon: '🔴' },
  { name: 'OSM', fullName: 'Otite Séromuqueuse', options: ['Aucun'], icon: '🟡' },
  { name: 'Perfo', fullName: 'Perforation', options: ['Marginale', 'Non Marginale'], icon: '🔵' },
  { name: 'Chole', fullName: 'Cholestéatome', options: ['Atticale', 'Post-Sup', 'Attic + Post-Sup'], icon: '🟣' },
  { name: 'PDR + Atel', fullName: 'Poche de Rétraction + Atélectasie', options: ['Stade I', 'Stade II', 'Stade III'], icon: '🟠' },
  { name: 'Normal', fullName: 'Tympan Normal', options: ['Aucun'], icon: '🟢' },
  { name: 'Autre', fullName: 'Autre Pathologie', options: ['Aucun'], icon: '⚪' }
];

export default function Accueil() {
  const [fileQueue, setFileQueue] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selections, setSelections] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [collaborator, setCollaborator] = useState(null);
  const [sessionMode, setSessionMode] = useState('solo');

  useEffect(() => {
    const initSession = async () => {
      const storedUser = localStorage.getItem('user');
      const storedCollab = localStorage.getItem('collaborateur');
      const storedMode = localStorage.getItem('mode_session');

      if (storedUser) {
        const userProfile = JSON.parse(storedUser);
        setCurrentUser(userProfile);
        console.log('Utilisateur chargé:', userProfile);
      }

      if (storedCollab) {
        const collabProfile = JSON.parse(storedCollab);
        setCollaborator(collabProfile);
        console.log('Collaborateur chargé:', collabProfile);
      }

      setSessionMode(storedMode || 'solo');
    };
    
    initSession();
  }, []);

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      const queue = imageFiles.map((file, index) => ({
        id: index, 
        file, 
        preview: URL.createObjectURL(file), 
        status: 'pending', 
        name: file.name
      }));
      setFileQueue(queue);
      setCurrentIndex(0);
      setSelectedFile(queue[0].file);
      setSelectedImage(queue[0].preview);
    }
  };

  const calculateHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async () => {
    if (!selectedFile || Object.keys(selections).length === 0 || !currentUser) {
      setSaveMessage("⚠️ Sélectionner une pathologie");
      return;
    }

    setIsSaving(true);
    try {
      const imageHash = await calculateHash(selectedFile);
      
      // VÉRIFICATION : Ce médecin a-t-il déjà diagnostiqué cette image ?
      const { data: existingDiagnostics, error: checkError } = await supabase
        .from('categories_diagnostics')
        .select('utilisateur_id')
        .eq('image_hash', imageHash);

      if (checkError) throw checkError;

      // Déterminer les médecins participants
      const medecinsPresents = sessionMode === 'collaboration' && collaborator
        ? [currentUser, collaborator]
        : [currentUser];

      // FILTRER les médecins qui n'ont PAS ENCORE diagnostiqué cette image
      const medicinsADiagnostiquer = medecinsPresents.filter(medecin => {
        const dejaDiagnostique = existingDiagnostics?.some(
          diag => diag.utilisateur_id === medecin.id
        );
        if (dejaDiagnostique) {
          console.log(`⚠️ Le médecin ${medecin.prenom} ${medecin.nom} a déjà diagnostiqué cette image`);
        }
        return !dejaDiagnostique;
      });

      if (medicinsADiagnostiquer.length === 0) {
        setSaveMessage("⚠️ Vous avez déjà diagnostiqué cette image");
        setTimeout(() => {
          if (currentIndex < fileQueue.length - 1) {
            const next = currentIndex + 1;
            setCurrentIndex(next);
            setSelectedFile(fileQueue[next].file);
            setSelectedImage(fileQueue[next].preview);
            setSelections({});
            setSaveMessage('');
          }
        }, 2000);
        setIsSaving(false);
        return;
      }

      const { count } = await supabase
        .from('categories_diagnostics')
        .select('*', { count: 'exact', head: true })
        .eq('image_hash', imageHash);

      const nbAvisExistants = count || 0;
      const totalNombreAvis = nbAvisExistants + medicinsADiagnostiquer.length;

      const fileExtension = selectedFile.name.split('.').pop();
      const baseName = selectedFile.name.split('.').slice(0, -1).join('.');
      const diseaseKeys = Object.keys(selections);
      const modeLabel = sessionMode === 'collaboration' ? 'Conjoint' : 'Simple';
      
      const maladiesDetails = diseaseKeys.map(key => {
        const stage = selections[key].stage;
        return (stage && stage !== 'Aucun') ? `${key}_${stage}` : key;
      }).join('_');

      const records = [];

      // INSÉRER SEULEMENT POUR LES MÉDECINS QUI N'ONT PAS ENCORE DIAGNOSTIQUÉ
      for (const doc of medicinsADiagnostiquer) {
        const prenomMedecin = doc.prenom || '';
        const nomMedecin = doc.nom || '';
        const nomComplet = `${prenomMedecin} ${nomMedecin}`.trim() || "Médecin Inconnu";

        console.log('Médecin en cours de sauvegarde:', doc);
        console.log('Nom complet construit:', nomComplet);

        const nouveauNomFichier = `${baseName}_${totalNombreAvis}_${modeLabel}_${maladiesDetails}_${doc.id}.${fileExtension}`.replace(/\s+/g, '');
        const storagePath = `diagnostics/${diseaseKeys[0].toLowerCase()}/${nouveauNomFichier}`;

        // Upload physique
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(storagePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(storagePath);

        records.push({
          image_hash: imageHash,
          image_url: publicUrl,
          utilisateur_id: doc.id,
          nom_medecin_diagnostiqueur: nomComplet,
          maladie_nom: diseaseKeys.join(' + '),
          stade_nom: diseaseKeys.map(k => selections[k].stage || 'Aucun').join(' / '),
          nom_image_originale: selectedFile.name,
          nom_image_renommee: nouveauNomFichier,
          path_image_final: storagePath,
          date_diagnostique: new Date().toISOString().split('T')[0]
        });
      }

      console.log('=== INSERTION ===');
      console.log('Nombre de records:', records.length);
      console.log('Records:', records);

      // STRATÉGIE : Insérer UN PAR UN pour identifier quel médecin pose problème
      let successCount = 0;
      let failedMedecin = null;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        console.log(`Tentative ${i+1}/${records.length} pour:`, record.nom_medecin_diagnostiqueur);
        
        const { data, error } = await supabase
          .from('categories_diagnostics')
          .insert([record]);
        
        if (error) {
          console.error(`❌ Échec pour ${record.nom_medecin_diagnostiqueur}:`, error);
          console.error('Détails erreur:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Si c'est une erreur RLS et qu'on est en mode collaboration
          if (error.message.includes('row-level security') && sessionMode === 'collaboration') {
            failedMedecin = record.nom_medecin_diagnostiqueur;
            console.log('⚠️ Erreur RLS détectée pour le collaborateur');
            
            // SOLUTION : Utiliser une approche différente pour le collaborateur
            // Marquer ce record pour réessayer avec une méthode alternative
            console.log('Tentative avec méthode alternative...');
            
            // Alternative : Insérer via une fonction Postgres (si vous en créez une)
            // Ou simplement logger l'erreur et continuer
            throw new Error(`Impossible d'insérer le diagnostic pour ${failedMedecin}. Vérifiez les permissions du collaborateur.`);
          } else {
            throw error;
          }
        } else {
          console.log(`✅ Succès pour ${record.nom_medecin_diagnostiqueur}`);
          successCount++;
        }
      }

      if (successCount > 0) {
        setSaveMessage(`✅ ${successCount} avis enregistré(s) !`);
      }
      
      if (failedMedecin) {
        setSaveMessage(`⚠️ ${successCount} avis enregistré(s), mais échec pour ${failedMedecin}`);
      }

      setFileQueue(prev => prev.map((item, idx) => idx === currentIndex ? { ...item, status: 'uploaded' } : item));
      
      setTimeout(() => {
         if (currentIndex < fileQueue.length - 1) {
           const next = currentIndex + 1;
           setCurrentIndex(next);
           setSelectedFile(fileQueue[next].file);
           setSelectedImage(fileQueue[next].preview);
           setSelections({});
           setSaveMessage('');
         }
      }, 2000);

    } catch (err) {
      console.error('❌ Erreur lors de l\'upload:', err);
      setSaveMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white">
      <GlobalMenu />
      
      <div className="flex flex-1 p-6 gap-6 mt-14 overflow-hidden h-[calc(100vh-60px)]">
        
        {/* FILE D'ATTENTE */}
        <div className="w-80 bg-slate-800/50 rounded-3xl border border-white/10 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ImageIcon size={18} className="text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest">File d'attente</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {fileQueue.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => { if (!isSaving) { setCurrentIndex(idx); setSelectedFile(item.file); setSelectedImage(item.preview); }}} 
                className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-cyan-400' : 'border-transparent opacity-50'}`}
              >
                <img src={item.preview} alt="mini" className="w-full h-24 object-cover" />
                {item.status === 'uploaded' && (
                  <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center">
                    <CheckCircle2 size={30} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DIAGNOSTIC ET VISUALISATION */}
        <div className="flex-1 flex gap-6">
          <div className="w-[400px] bg-slate-800/30 rounded-3xl p-6 border border-white/10 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-widest">Diagnostic</h3>
            
            {/* Affichage du médecin connecté */}
            {currentUser && (
              <div className="mb-6 p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
                <p className="text-[10px] font-bold text-cyan-400 uppercase mb-1">Médecin 1</p>
                <p className="text-sm font-bold text-white">Dr. {currentUser.prenom} {currentUser.nom}</p>
                {sessionMode === 'collaboration' && collaborator && (
                  <>
                    <p className="text-[10px] font-bold text-blue-400 uppercase mt-3 mb-1">Médecin 2</p>
                    <p className="text-sm font-bold text-white">Dr. {collaborator.prenom} {collaborator.nom}</p>
                  </>
                )}
              </div>
            )}

            <div className="space-y-3">
              {categoryOptions.map((cat, idx) => (
                <div key={idx} className={`p-4 border rounded-2xl transition-all ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{cat.name}</div>
                      <div className="text-[9px] text-slate-400 uppercase">{cat.fullName}</div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-cyan-400" 
                      checked={!!selections[cat.name]} 
                      onChange={(e) => {
                        const newSels = {...selections};
                        if(e.target.checked) newSels[cat.name] = {stage: 'Aucun'};
                        else delete newSels[cat.name];
                        setSelections(newSels);
                      }} 
                    />
                  </div>
                  {selections[cat.name] && cat.options[0] !== 'Aucun' && (
                    <select 
                      className="mt-3 bg-slate-900 text-[10px] p-3 rounded-xl border border-cyan-500/30 w-full"
                      value={selections[cat.name].stage}
                      onChange={(e) => setSelections({...selections, [cat.name]: {stage: e.target.value}})}
                    >
                      <option value="Aucun">Stade...</option>
                      {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 bg-slate-900/50 border-2 border-dashed border-white/5 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden">
              {!selectedImage ? (
                <label className="cursor-pointer text-center">
                  <Upload className="text-cyan-400 mx-auto mb-4" size={32} />
                  <p className="font-black uppercase text-[10px] text-slate-400">Charger dossier</p>
                  <input type="file" className="hidden" webkitdirectory="true" directory="true" multiple onChange={handleFolderChange} />
                </label>
              ) : (
                <img src={selectedImage} className="max-h-full max-w-full object-contain" alt="Vue" />
              )}
            </div>
            <button 
              onClick={handleUpload} 
              disabled={isSaving || !selectedFile || Object.keys(selections).length === 0} 
              className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest ${isSaving ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500'}`}
            >
              {isSaving ? <Activity className="animate-spin mx-auto" /> : 'Valider'}
            </button>
            {saveMessage && <div className="p-4 rounded-2xl text-center text-[10px] bg-cyan-500/10 text-cyan-400">{saveMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}