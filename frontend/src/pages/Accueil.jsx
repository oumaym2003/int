import React, { useState, useEffect } from 'react';
import { Upload, X, ChevronRight, Activity, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []); 

  // Nettoyage des URLs mémoires pour éviter les fuites
  useEffect(() => {
    return () => fileQueue.forEach(item => URL.revokeObjectURL(item.preview));
  }, [fileQueue]);

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

  const sanitizePart = (value, fallback) => {
    if (!value) return fallback;
    return value.trim().toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/\+/g, 'plus')
      .replace(/[^a-z0-9_-]/g, '') || fallback;
  };

  const handleUpload = async () => {
    if (!selectedFile || Object.keys(selections).length === 0 || !currentUser) {
      setSaveMessage("⚠️ Sélectionner une pathologie");
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('⏳ Préparation...');

    try {
      // 1. Hash pour unicité
      const imageHash = await calculateHash(selectedFile);
      
      // 2. Vérifier si cet utilisateur a déjà envoyé cette image exacte
      const { data: existing } = await supabase
        .from('categories_diagnostics')
        .select('id')
        .eq('image_hash', imageHash)
        .eq('utilisateur_id', currentUser.id)
        .maybeSingle();

      if (existing) {
        setSaveMessage('⚠️ Vous avez déjà enregistré cette image.');
        setIsSaving(false);
        return;
      }

      // 3. Préparer les données
      const selectedKeys = Object.keys(selections);
      const nomMaladie = selectedKeys.join(' + ');
      const stadeNom = selectedKeys.map(k => selections[k].stage || 'Aucun').join(' / ');
      const maladiePart = sanitizePart(selectedKeys[0], 'inconnue'); // Pour le dossier principal
      
      const fileExt = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const newFileName = `${maladiePart}_m${currentUser.id}_${timestamp}.${fileExt}`;
      const storagePath = `utilisateur_${currentUser.id}/${maladiePart}/${newFileName}`;

      setSaveMessage('🚀 Upload image...');

      // 4. Upload vers le Storage (Assurez-vous que le bucket 'images' est PUBLIC)
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(storagePath, selectedFile);

      if (uploadError) throw uploadError;

      // 5. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);

      setSaveMessage('💾 Enregistrement BDD...');

      // 6. Insertion Database
      const { error: dbError } = await supabase
        .from('categories_diagnostics')
        .insert([{
          maladie_nom: nomMaladie,
          stade_nom: stadeNom,
          image_url: publicUrl,
          image_hash: imageHash,
          nom_image_originale: selectedFile.name,
          nom_image_renommee: newFileName,
          path_image_final: storagePath,
          utilisateur_id: currentUser.id,
          nom_medecin_diagnostiqueur: `${currentUser.prenom} ${currentUser.nom}`,
          date_diagnostique: new Date().toISOString().split('T')[0]
        }]);

      if (dbError) throw dbError;

      // 7. Mise à jour UI
      const updatedQueue = [...fileQueue];
      updatedQueue[currentIndex].status = 'uploaded';
      setFileQueue(updatedQueue);

      // Passage automatique à la suivante
      if (currentIndex < fileQueue.length - 1) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setSelectedFile(fileQueue[next].file);
        setSelectedImage(fileQueue[next].preview);
        setSelections({});
        setSaveMessage('✅ Enregistré ! Suivante...');
      } else {
        setSaveMessage("🎉 Terminé ! Toutes les images sont traitées.");
      }

    } catch (err) {
      console.error(err);
      setSaveMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white">
      <GlobalMenu />
      
      <div className="flex flex-1 p-6 gap-6 mt-14 overflow-hidden h-[calc(100vh-60px)]">
        
        {/* GALERIE GAUCHE */}
        <div className="w-80 bg-slate-800/50 rounded-3xl border border-white/10 p-4 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest">File d'attente</h2>
            </div>
            <span className="text-[10px] bg-slate-700 px-2 py-1 rounded-full">{fileQueue.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {fileQueue.length === 0 && (
              <div className="text-center py-10 opacity-20">
                <Upload size={40} className="mx-auto mb-2" />
                <p className="text-[10px] uppercase font-bold">Aucun dossier chargé</p>
              </div>
            )}
            {fileQueue.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  if (!isSaving) {
                    setCurrentIndex(idx);
                    setSelectedFile(item.file);
                    setSelectedImage(item.preview);
                    setSaveMessage('');
                  }
                }} 
                className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 group ${currentIndex === idx ? 'border-cyan-400 scale-[1.02] shadow-lg shadow-cyan-500/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                <img src={item.preview} alt="mini" className="w-full h-24 object-cover" />
                {item.status === 'uploaded' && (
                  <div className="absolute inset-0 bg-green-500/60 backdrop-blur-[2px] flex items-center justify-center">
                    <CheckCircle2 size={30} className="text-white drop-shadow-md" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] truncate px-2 font-mono">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE CENTRALE */}
        <div className="flex-1 flex gap-6">
          {/* SÉLECTION PATHOLOGIE */}
          <div className="w-[400px] bg-slate-800/30 rounded-3xl p-6 border border-white/10 overflow-y-auto custom-scrollbar shadow-inner">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-widest flex items-center gap-2">
              <Activity size={14} /> Diagnostic Médical
            </h3>
            
            <div className="space-y-3">
              {categoryOptions.map((cat, idx) => (
                <div key={idx} className={`group p-4 border rounded-2xl transition-all cursor-pointer ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/5' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white">{cat.name}</div>
                      <div className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{cat.fullName}</div>
                    </div>
                    
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-cyan-400 cursor-pointer" 
                      checked={!!selections[cat.name]} 
                      onChange={(e) => {
                        const newSels = {...selections};
                        if(e.target.checked) newSels[cat.name] = {stage: 'Aucun'};
                        else delete newSels[cat.name];
                        setSelections(newSels);
                      }} 
                    />
                  </div>

                  {/* Options de stade si coché */}
                  {selections[cat.name] && cat.options[0] !== 'Aucun' && (
                    <div className="mt-3 pt-3 border-t border-cyan-400/20 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-1">
                      <select 
                        className="bg-slate-900 text-[10px] font-bold p-3 rounded-xl border border-cyan-500/30 outline-none w-full appearance-none"
                        value={selections[cat.name].stage}
                        onChange={(e) => setSelections({...selections, [cat.name]: {stage: e.target.value}})}
                      >
                        <option value="Aucun">Sélectionner un stade...</option>
                        {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* APERÇU ET ACTIONS */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 bg-slate-900/50 border-2 border-dashed border-white/5 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group shadow-2xl">
              {!selectedImage ? (
                <label className="cursor-pointer flex flex-col items-center group">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-all">
                    <Upload className="text-cyan-400" size={32} />
                  </div>
                  <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">Charger un dossier patient</p>
                  <p className="text-[9px] text-slate-600 mt-2 font-bold italic">Glissez-déposez ou cliquez ici</p>
                  <input type="file" className="hidden" webkitdirectory="true" directory="true" multiple onChange={handleFolderChange} />
                </label>
              ) : (
                <>
                  <img src={selectedImage} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" alt="Vue" />
                  <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <p className="text-[10px] font-mono text-cyan-400">{selectedFile?.name}</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleUpload} 
                disabled={isSaving || !selectedFile || Object.keys(selections).length === 0} 
                className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${isSaving ? 'bg-slate-700 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 hover:shadow-cyan-500/20 active:scale-[0.98]'}`}
              >
                {isSaving ? (
                  <>
                    <Activity className="animate-spin" size={18} />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Valider le Diagnostic
                  </>
                )}
              </button>
              
              {saveMessage && (
                <div className={`p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest animate-in zoom-in-95 ${saveMessage.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        input[type="checkbox"] { border-radius: 6px; }
      `}</style>
    </div>
  );
}