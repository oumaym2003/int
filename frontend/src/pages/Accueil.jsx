import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, X, ChevronRight, Activity, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import GlobalMenu from '../components/GlobalMenu';

const categoryOptions = [
  { name: 'OMA', fullName: 'Otite Moyenne Aiguë', options: ['cong', 'sup', 'perf'], icon: '🔴' },
  { name: 'OSM', fullName: 'Otite Séromuqueuse', options: [], icon: '🟡' },
  { name: 'Perfo', fullName: 'Perforation', options: ['mag', 'Nmag'], icon: '🔵' },
  { name: 'Chole', fullName: 'Cholestéatome', options: ['attic', 'Post-sup', 'attic Post-sup'], icon: '🟣' },
  { name: 'PDR + Atel', fullName: 'Poche de Rétraction + Atélectasie', options: ['stade I', 'stade II', 'stade III'], icon: '🟠' },
  { name: 'Normal', fullName: 'Tympan Normal', options: [], icon: '🟢' },
  { name: 'Autre', fullName: 'Autre Pathologie', options: [], icon: '⚪' }
];

export default function Accueil() {
  const [fileQueue, setFileQueue] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selections, setSelections] = useState({}); 

  const API_BASE_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    return () => fileQueue.forEach(item => URL.revokeObjectURL(item.preview));
  }, [fileQueue]);

  // FONCTION DE CHARGEMENT DE DOSSIER (BACK TO FOLDER UPLOAD)
  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files);
    
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || /\.(png|jpe?g|tiff?)$/i.test(file.name)
    );

    if (imageFiles.length > 0) {
      const queue = imageFiles.map((file, index) => ({
        id: index,
        file: file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        name: file.name
      }));
      setFileQueue(queue);
      setCurrentIndex(0);
      setSelectedFile(queue[0].file);
      setSelectedImage(queue[0].preview);
      setSaveMessage(`📂 Dossier chargé : ${imageFiles.length} images.`);
    }
  };

  const selectFromQueue = (index) => {
    if (!fileQueue[index]) return;
    setCurrentIndex(index);
    setSelectedFile(fileQueue[index].file);
    setSelectedImage(fileQueue[index].preview);
    setSelections({}); 
    setSaveMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    
    const user = JSON.parse(localStorage.getItem('user')) || { id: 1, nom: 'Inconnu', prenom: 'Dr' };
    const selectedKeys = Object.keys(selections);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('nom_maladie', selectedKeys.join(' + ')); 
    formData.append('type_maladie', selectedKeys.map(k => selections[k].stage || 'Standard').join(' / ')); 
    formData.append('utilisateur_id', user.id);
    formData.append('nom_medecin_diagnostiqueur', `${user.prenom} ${user.nom}`);

    try {
      await axios.post(`${API_BASE_URL}/api/diagnostic/`, formData);
      const updatedQueue = [...fileQueue];
      updatedQueue[currentIndex].status = 'uploaded';
      setFileQueue(updatedQueue);

      if (currentIndex < fileQueue.length - 1) {
        selectFromQueue(currentIndex + 1);
      } else {
        setSaveMessage("✅ Session terminée !");
      }
    } catch (e) {
      setSaveMessage("❌ Erreur de connexion.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white">
      <GlobalMenu />
      
      <div className="flex flex-1 p-6 gap-6 mt-14 overflow-hidden">
        
        {/* LISTE DES MINIATURES */}
        <div className="w-80 bg-slate-800/50 rounded-3xl border border-white/10 p-4 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ImageIcon size={18} className="text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Images du dossier</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {fileQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-4">
                <AlertCircle size={32} className="mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-tighter">Importez le dossier patient</p>
              </div>
            ) : (
              fileQueue.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => selectFromQueue(idx)} 
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    currentIndex === idx ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={item.preview} alt="miniature" className="w-full h-24 object-cover" />
                  
                  {/* ZONE ENTOURÉE EN VERT : BADGE VIDE SANS TEXTE */}
                  {item.status === 'pending' && (
                    <div className="absolute top-2 left-2 bg-red-600 w-3 h-3 rounded-full shadow-lg animate-pulse flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}

                  {item.status === 'uploaded' && (
                    <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-white drop-shadow-md" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-[8px] truncate">{item.name}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ZONE DE TRAVAIL */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Formulaire Diagnostic */}
          <div className="w-1/2 bg-slate-800/30 rounded-3xl border border-white/10 p-6 h-fit shadow-xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Paramètres Diagnostic</h3>
            <div className="space-y-3">
              {categoryOptions.map((cat, idx) => (
                <div key={idx} className={`p-4 border rounded-2xl transition-all ${selections[cat.name] ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{cat.name}</div>
                      <div className="text-[9px] opacity-40 uppercase">{cat.fullName}</div>
                    </div>
                    {cat.options.length > 0 && selections[cat.name] && (
                      <select 
                        className="bg-slate-900 text-[10px] p-2 rounded-lg border border-cyan-500/50 outline-none"
                        onChange={(e) => setSelections({...selections, [cat.name]: {...selections[cat.name], stage: e.target.value}})}
                      >
                        <option value="">Standard</option>
                        {cat.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-cyan-400 cursor-pointer" 
                      checked={!!selections[cat.name]} 
                      onChange={(e) => {
                        const newSels = {...selections};
                        if(e.target.checked) newSels[cat.name] = {stage: ''};
                        else delete newSels[cat.name];
                        setSelections(newSels);
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prévisualisation */}
          <div className="w-1/2 flex flex-col gap-4">
            <div className="flex-1 bg-slate-800/20 border-2 border-dashed border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner min-h-[400px]">
              {!selectedImage ? (
                <label className="flex flex-col items-center cursor-pointer group text-center">
                  <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-cyan-400" size={32} />
                  </div>
                  <p className="font-bold text-lg uppercase tracking-tighter">Importer le dossier Patient</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase italic opacity-60">Sélectionnez le dossier contenant les images</p>
                  
                  {/* INPUT POUR DOSSIER COMPLET */}
                  <input 
                    type="file" 
                    className="hidden" 
                    webkitdirectory="true" 
                    directory="true" 
                    multiple 
                    onChange={handleFolderChange} 
                  />
                </label>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <img 
                    src={selectedImage} 
                    className="max-h-[440px] rounded-2xl border border-white/10 shadow-2xl object-contain bg-black/20" 
                    alt="Vue" 
                  />
                  <button 
                    onClick={() => {setFileQueue([]); setSelectedImage(null);}} 
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 p-2 rounded-full shadow-lg transition-all"
                  >
                    <X size={18}/>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleUpload} 
              disabled={isSaving || !selectedFile || Object.keys(selections).length === 0} 
              className={`w-full py-5 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 ${
                Object.keys(selections).length > 0 
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-xl shadow-cyan-500/20' 
                : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed border border-white/5'
              }`}
            >
              {isSaving ? <Activity className="animate-spin" /> : 'Valider et Suivant'}
              {!isSaving && <ChevronRight size={18}/>}
            </button>
            
            {saveMessage && (
              <div className="text-center text-[10px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}