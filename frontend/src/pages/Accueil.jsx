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

  useEffect(() => {
    return () => fileQueue.forEach(item => URL.revokeObjectURL(item.preview));
  }, [fileQueue]);

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      const queue = imageFiles.map((file, index) => ({
        id: index, file, preview: URL.createObjectURL(file), status: 'pending', name: file.name
      }));
      setFileQueue(queue);
      setCurrentIndex(0);
      setSelectedFile(queue[0].file);
      setSelectedImage(queue[0].preview);
    }
  };

  // Fonction pour calculer le hash SHA256 d'un fichier
  const calculateHash = async (file) => {
    const subtle = window.crypto && window.crypto.subtle;
    if (!subtle) {
      // Fallback non-crypto pour eviter une erreur en contexte non-secure
      const raw = `fallback_${file.name}_${file.size}_${file.lastModified}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i += 1) {
        hash = ((hash << 5) - hash + raw.charCodeAt(i)) >>> 0;
      }
      const hex = hash.toString(16).padStart(8, '0');
      return hex.repeat(8).slice(0, 64);
    }
    const buffer = await file.arrayBuffer();
    const hashBuffer = await subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Fonction pour sanitizer les noms
  const sanitizePart = (value, fallback) => {
    if (!value) return fallback;
    return value.trim().toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/\+/g, 'plus')
      .replace(/[/\\:]/g, '-')
      .replace(/[^a-z0-9_-]/g, '') || fallback;
  };

  const handleUpload = async () => {
    if (!selectedFile || Object.keys(selections).length === 0 || !currentUser) return;
    setIsSaving(true);
    setSaveMessage('⏳ Calcul hash image...');
    
    const selectedKeys = Object.keys(selections);
    const nomMaladie = selectedKeys.join(' + ');
    const stadeNom = selectedKeys.map(k => selections[k].stage || 'Aucun').join(' / ');

    try {
      // 1. Calculer le hash de l'image pour éviter les doublons
      const imageHash = await calculateHash(selectedFile);
      
      // 2. Vérifier si l'image existe déjà pour cet utilisateur
      const { data: existingDiag } = await supabase
        .from('categories_diagnostics')
        .select('*')
        .eq('image_hash', imageHash)
        .eq('utilisateur_id', currentUser.id);

      if (existingDiag && existingDiag.length > 0) {
        setSaveMessage('⚠️ Image déjà enregistrée !');
        return;
      }

      setSaveMessage('⏳ Comptage des diagnostics...');

      // 3. Compter les images existantes pour générer l'ID unique
      const { count } = await supabase
        .from('categories_diagnostics')
        .select('*', { count: 'exact', head: true });

      const compteur = (count || 0) + 1;

      // 4. Générer le nom de fichier selon le format: maladie_type_m{userId}_{count}.jpg
      const maladiePart = sanitizePart(nomMaladie, 'inconnue');
      const typePart = sanitizePart(stadeNom, 'standard');
      const newFileName = `${maladiePart}_${typePart}_m${currentUser.id}_${compteur}.jpg`;

      // 5. Organiser par dossiers: utilisateur_{id}/classe_{maladie}/
      const storagePath = `utilisateur_${currentUser.id}/classe_${maladiePart}/${newFileName}`;

      setSaveMessage('⏳ Upload en cours...');

      // 6. Upload vers le Storage avec structure organisée
      const { error: uploadError } = await supabase.storage
        .from('diagnostics-images')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('diagnostics-images')
        .getPublicUrl(storagePath);

      setSaveMessage('⏳ Enregistrement en base...');

      // 7. Insertion complète dans la table avec toutes les métadonnées
      const { error: dbError } = await supabase
        .from('categories_diagnostics')
        .insert([{
          maladie_nom: nomMaladie,
          stade_nom: stadeNom,
          image_url: urlData.publicUrl,
          image_hash: imageHash,
          nom_image_originale: selectedFile.name,
          nom_image_renommee: newFileName,
          path_image_final: storagePath,
          utilisateur_id: currentUser.id,
          nom_medecin_diagnostiqueur: `${currentUser.prenom} ${currentUser.nom}`,
          date_diagnostique: new Date().toISOString().split('T')[0],
          date_insertion_bdd: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      // Update UI
      const updatedQueue = [...fileQueue];
      updatedQueue[currentIndex].status = 'uploaded';
      setFileQueue(updatedQueue);

      if (currentIndex < fileQueue.length - 1) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setSelectedFile(fileQueue[next].file);
        setSelectedImage(fileQueue[next].preview);
        setSelections({});
        setSaveMessage('✅ Enregistré ! Image suivante...');
      } else {
        setSaveMessage("✅ Tous les diagnostics terminés !");
      }
    } catch (e) {
      console.error('Erreur:', e);
      setSaveMessage(`❌ Erreur : ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white">
      <GlobalMenu />
      <div className="flex flex-1 p-6 gap-6 mt-14 overflow-hidden">
        
        {/* GALERIE GAUCHE */}
        <div className="w-80 bg-slate-800/50 rounded-3xl border border-white/10 p-4 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ImageIcon size={18} className="text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Images Patient</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {fileQueue.map((item, idx) => (
              <div key={idx} onClick={() => {
                setCurrentIndex(idx);
                setSelectedFile(item.file);
                setSelectedImage(item.preview);
                setSaveMessage('');
              }} className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-cyan-400' : 'border-transparent opacity-60'}`}>
                <img src={item.preview} alt="mini" className="w-full h-24 object-cover" />
                {item.status === 'pending' && (
                  <div className="absolute top-2 left-2 bg-red-600 w-3 h-3 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
                {item.status === 'uploaded' && (
                  <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center"><CheckCircle2 size={24} className="text-white" /></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ZONE CENTRALE */}
        <div className="flex-1 flex gap-6">
          <div className="w-1/2 bg-slate-800/30 rounded-3xl p-6 border border-white/10 overflow-y-auto h-[calc(100vh-120px)] custom-scrollbar">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">Diagnostic à poser</h3>
            <div className="space-y-3">
              {categoryOptions.map((cat, idx) => (
                <div key={idx} className={`p-4 border rounded-2xl transition-all ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1 text-sm font-bold">{cat.name}</div>
                    {selections[cat.name] && cat.options[0] !== 'Aucun' && (
                      <select 
                        className="bg-slate-900 text-[10px] p-2 rounded-lg border border-cyan-500/50 outline-none"
                        onChange={(e) => setSelections({...selections, [cat.name]: {stage: e.target.value}})}
                      >
                        <option value="Aucun">Stade...</option>
                        {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    <input type="checkbox" className="w-5 h-5 accent-cyan-400" checked={!!selections[cat.name]} onChange={(e) => {
                      const newSels = {...selections};
                      if(e.target.checked) newSels[cat.name] = {stage: 'Aucun'};
                      else delete newSels[cat.name];
                      setSelections(newSels);
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/2 flex flex-col gap-4">
            <div className="flex-1 bg-slate-800/20 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center relative">
              {!selectedImage ? (
                <label className="cursor-pointer flex flex-col items-center">
                  <Upload className="text-cyan-400 mb-4" size={32} />
                  <p className="font-bold uppercase text-xs">Charger le Dossier</p>
                  <input type="file" className="hidden" webkitdirectory="true" directory="true" multiple onChange={handleFolderChange} />
                </label>
              ) : (
                <img src={selectedImage} className="max-h-full rounded-2xl object-contain p-4" alt="Vue" />
              )}
            </div>
            <button onClick={handleUpload} disabled={isSaving || !selectedFile || Object.keys(selections).length === 0} className="w-full py-5 bg-cyan-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-400 text-white disabled:opacity-30">
              {isSaving ? <Activity className="animate-spin" /> : 'Valider et Enregistrer'}
            </button>
            <p className="text-center text-[10px] text-cyan-400 font-bold">{saveMessage}</p>
          </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`}</style>
    </div>
  );
}