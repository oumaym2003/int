import os
import hashlib
import datetime
import io
import re
import traceback
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from PIL import Image
from pathlib import Path

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIR_UPLOADS = os.path.join(BASE_DIR, "uploads")
DIR_ORIGINAUX = os.path.join(DIR_UPLOADS, "originaux")
DIR_CLASSES = os.path.join(DIR_UPLOADS, "classes")

for d in [DIR_ORIGINAUX, DIR_CLASSES]:
    os.makedirs(d, exist_ok=True)

try:
    from . import models, database
except ImportError:
    import models, database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=DIR_UPLOADS), name="uploads")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ROUTES ---

@app.post("/api/diagnostic/")
async def create_diagnostic(
    file: UploadFile = File(None), 
    nom_maladie: str = Form(...),
    type_maladie: str = Form(...),
    utilisateur_id: int = Form(...), 
    nom_medecin_diagnostiqueur: str = Form(...), 
    utilisateur_id_2: int = Form(None), 
    nom_medecin_diagnostiqueur_2: str = Form(None), 
    image_hash_existant: str = Form(None), 
    db: Session = Depends(get_db)
):
    try:
        # 1. Nettoyage des textes
        nom_maladie_propre = " ".join(nom_maladie.strip().split())
        type_maladie_propre = " ".join(type_maladie.strip().split()) if type_maladie else "Standard"

        # 2. Gestion du fichier et du Hash
        if image_hash_existant:
            sha256_hash = image_hash_existant
            image_bytes = None
        elif file:
            image_bytes = await file.read()
            sha256_hash = hashlib.sha256(image_bytes).hexdigest()
        else:
            raise HTTPException(status_code=400, detail="Image manquante")

        # 3. Vérifier si l'image existe déjà
        existant = db.query(models.Diagnostic).filter(models.Diagnostic.image_hash == sha256_hash).first()

        if existant:
            # Récupération des données existantes
            nom_image_originale = existant.nom_image_originale
            nom_image_renommee = existant.nom_image_renommee
            path_image_final = existant.path_image_final
        else:
            # --- LOGIQUE DE NOMMAGE (Nouvelle image) ---
            
            # A. Nom original (on garde le nom tel quel pour le dossier originaux)
            nom_image_originale = os.path.basename(file.filename)
            
            # B. Construction du nom classé
            # Session: SEUL ou CONJOINT
            mode_session = "CONJOINT" if utilisateur_id_2 else "SEUL"
            
            # Analyse des maladies (ex: "OMA + Perfo")
            maladies_list = [m.strip() for m in nom_maladie_propre.split("+") if m.strip()]
            types_list = [t.strip() for t in type_maladie_propre.split("/") if t.strip()]
            nb_maladies = len(maladies_list)
            
            # Bloc maladie/type : _Maladie1_Type1...
            detail_maladies = ""
            for i in range(nb_maladies):
                m_nom = re.sub(r'[^a-zA-Z0-9]', '', maladies_list[i])
                m_type = "Standard"
                if i < len(types_list):
                    m_type = re.sub(r'[^a-zA-Z0-9]', '', types_list[i])
                detail_maladies += f"_{m_nom}_{m_type}"

            # Bloc IDs
            ids_medecins = f"ID{utilisateur_id}"
            if utilisateur_id_2:
                ids_medecins += f"_ID{utilisateur_id_2}"

            # Nom final classé
            stem_original = Path(nom_image_originale).stem
            extension = Path(nom_image_originale).suffix
            nom_image_renommee = f"{stem_original}_{mode_session}_{nb_maladies}{detail_maladies}_{ids_medecins}{extension}"
            
            path_image_final = f"uploads/classes/{nom_image_renommee}"

            # --- SAUVEGARDES ---
            
            # 1. Sauvegarde du fichier ORIGINAL (nom d'origine) dans /originaux
            path_orig = os.path.join(DIR_ORIGINAUX, nom_image_originale)
            with open(path_orig, "wb") as f_orig:
                f_orig.write(image_bytes)

            # 2. Sauvegarde du fichier CLASSÉ (nouveau nom) dans /classes
            path_class = os.path.join(DIR_CLASSES, nom_image_renommee)
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img.save(path_class, "JPEG", quality=95)

        # 4. Enregistrement BDD
        nouveau = models.Diagnostic(
            nom_maladie=nom_maladie_propre,
            type_maladie=type_maladie_propre,
            utilisateur_id=utilisateur_id,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            utilisateur_id_2=utilisateur_id_2,
            nom_medecin_diagnostiqueur_2=nom_medecin_diagnostiqueur_2,
            diagnostique_2=nom_maladie_propre if utilisateur_id_2 else None,
            type_maladie_2=type_maladie_propre if utilisateur_id_2 else None,
            image_hash=sha256_hash,
            nom_image_originale=nom_image_originale, # Nom intact
            nom_image_renommee=nom_image_renommee,   # Nom complexe
            path_image_final=path_image_final,
            date_diagnostique=datetime.date.today(),
            date_insertion_bdd=datetime.datetime.now()
        )
        db.add(nouveau)
        db.commit()
        
        return {"status": "success", "image_classee": nom_image_renommee}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/diagnostic/{diag_id}")
def update_diagnostic(diag_id: int, data: dict, db: Session = Depends(get_db)):
    diag = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")

    # Vérification si on modifie le 1er ou le 2ème avis
    is_second = data.get("is_second", False)

    if is_second:
        # On met à jour les colonnes du DEUXIÈME avis
        diag.diagnostique_2 = data.get("nom_maladie")
        diag.type_maladie_2 = data.get("type_maladie")
        diag.utilisateur_id_2 = data.get("utilisateur_id")
    else:
        # On met à jour les colonnes du PREMIER avis
        diag.nom_maladie = data.get("nom_maladie")
        diag.type_maladie = data.get("type_maladie")
        diag.utilisateur_id = data.get("utilisateur_id")

    try:
        db.commit()
        return {"message": "Mis à jour avec succès"}
    except Exception as e:
        db.rollback()
        print(f"Erreur DB: {e}") # Regardez votre terminal Python pour voir l'erreur précise
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/diagnostic/{diag_id}")
async def delete_diagnostic(diag_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    diag = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
    if not diag: raise HTTPException(status_code=404)
    db.delete(diag)
    db.commit()
    return {"status": "success"}

# --- ROUTES DE CONSULTATION ---

@app.get("/api/diagnostics")
def list_diagnostics(db: Session = Depends(get_db)):
    rows = db.query(models.Diagnostic).all()
    output = []
    for r in rows:
        output.append({
            "id": r.id,
            "nom_maladie": r.nom_maladie,
            "type_maladie": r.type_maladie,
            "image_hash": r.image_hash,
            "path_image_final": r.path_image_final,
            "utilisateur_id": r.utilisateur_id,
            "utilisateur_id_2": r.utilisateur_id_2,
            # Noms adaptés à votre schéma BDD
            "nom_medecin_diagnostiqueur": r.nom_medecin_diagnostiqueur,
            "nom_medecin_diagnostiqueur_2": r.nom_medecin_diagnostiqueur_2,
            "diagnostique_2": r.diagnostique_2,
            "type_maladie_2": r.type_maladie_2
        })
    return output

@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password") or data.get("mot_de_passe")
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user or user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Erreur login")
    return {"id": user.id, "nom": user.nom, "prenom": user.prenom}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
    
@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    email = data.get('email', '').strip()
    password = data.get('mot_de_passe') or data.get('password')
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user or user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    return {"id": user.id, "nom": user.nom, "prenom": user.prenom, "email": user.email}


@app.post("/api/verifier-mdp")
def verifier_mot_de_passe(data: dict = Body(...), db: Session = Depends(get_db)):
    u_id = data.get("utilisateur_id")
    m_p = data.get("mot_de_passe")

    if u_id is None or m_p is None:
        raise HTTPException(status_code=400, detail="Données incomplètes")

    # On récupère l'utilisateur par son ID (en s'assurant que c'est un entier)
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == int(u_id)).first()

    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    # --- COMPARAISON EN CLAIR ---
    # .strip() est crucial pour ignorer les espaces accidentels
    if user.mot_de_passe.strip() != m_p.strip():
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return {"status": "success"}
@app.get("/api/suggestions-carousel/{utilisateur_id}")
def get_carousel_suggestions(utilisateur_id: int, db: Session = Depends(get_db)):
    all_diags = db.query(models.Diagnostic).all()
    groups = {}
    for d in all_diags:
        if d.image_hash not in groups:
            groups[d.image_hash] = []
        groups[d.image_hash].append(d)
    
    suggestions = []
    for hash_val, avis_list in groups.items():
        if any(a.utilisateur_id == utilisateur_id for a in avis_list):
            continue
            
        nb_avis = len(avis_list)
        if nb_avis == 1:
            suggestions.append(avis_list[0])
        elif nb_avis == 2:
            if avis_list[0].nom_maladie != avis_list[1].nom_maladie:
                suggestions.append(avis_list[0])
                
    return suggestions

@app.get("/api/diagnostics-groupes")
def get_diagnostics_groupes(db: Session = Depends(get_db)):
    all_diags = db.query(models.Diagnostic).order_by(models.Diagnostic.date_insertion_bdd.desc()).all()
    grouped = {}
    for d in all_diags:
        h = d.image_hash
        if h not in grouped:
            grouped[h] = {
                "image_url": d.path_image_final.replace("\\", "/"),
                "image_hash": d.image_hash,
                "avis": []
            }
        grouped[h]["avis"].append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "medecin": d.nom_medecin_diagnostiqueur,
            "date": d.date_diagnostique,
            "utilisateur_id": d.utilisateur_id
        })
        if d.diagnostique_2 or d.nom_medecin_diagnostiqueur_2:
            grouped[h]["avis"].append({
                "id": f"{d.id}-2",
                "nom_maladie": d.diagnostique_2,
                "type_maladie": d.type_maladie_2,
                "medecin": d.nom_medecin_diagnostiqueur_2,
                "date": d.date_diagnostique,
                "utilisateur_id": d.utilisateur_id_2,
                "is_second": True,
                "diagnostic_id": d.id
            })
    return list(grouped.values())

@app.get("/api/diagnostics/user/{user_id}")
def get_user_diagnostics(user_id: int, db: Session = Depends(get_db)):
    diagnostics = db.query(models.Diagnostic).filter(
        (models.Diagnostic.utilisateur_id == user_id) | (models.Diagnostic.utilisateur_id_2 == user_id)
    ).all()
    
    res = []
    for d in diagnostics:
        res.append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "nom_image_originale": d.nom_image_originale,
            "nom_image_renommee": d.nom_image_renommee,
            "image_url": d.path_image_final
        })
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)