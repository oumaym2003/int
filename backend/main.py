import os
import hashlib
import datetime
import io
import logging
import re
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from PIL import Image

import models  # type: ignore
import database  # type: ignore

<<<<<<< Updated upstream
=======
# --- CONFIGURATION DES RÉPERTOIRES ---
>>>>>>> Stashed changes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
DIR_ORIGINAUX = os.path.join(UPLOAD_ROOT, "originaux")
DIR_CLASSES = os.path.join(UPLOAD_ROOT, "classes")

os.makedirs(DIR_ORIGINAUX, exist_ok=True)
os.makedirs(DIR_CLASSES, exist_ok=True)

app = FastAPI(redirect_slashes=True)

<<<<<<< Updated upstream
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

=======
# Configuration CORS
>>>>>>> Stashed changes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

<<<<<<< Updated upstream

=======
# --- UTILITAIRES ---
>>>>>>> Stashed changes
def sanitize_part(value: str, fallback: str) -> str:
    if not value:
        return fallback
    cleaned = value.strip().lower()
    cleaned = (
        cleaned.replace(" ", "_")
        .replace("+", "plus")
        .replace("/", "-")
        .replace("\\", "-")
<<<<<<< Updated upstream
        .replace(":", "-")
=======
>>>>>>> Stashed changes
    )
    cleaned = re.sub(r"[^a-z0-9_-]+", "", cleaned)
    return cleaned or fallback

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
def normalize_avis_value(value: str) -> str:
    if not value:
        return ""
    return " ".join(value.strip().lower().split())

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
def avis_key(avis: models.Diagnostic) -> str:
    nom = normalize_avis_value(avis.nom_maladie)
    type_maladie = normalize_avis_value(avis.type_maladie)
    return f"{nom}::{type_maladie}"

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

<<<<<<< Updated upstream
=======
# --- ROUTES ---
>>>>>>> Stashed changes

@app.get("/api/diagnostics")
def get_all_diagnostics(db: Session = Depends(get_db)):
    diagnostics = db.query(models.Diagnostic).order_by(models.Diagnostic.id.desc()).all()
    resultat = []
    for d in diagnostics:
        clean_url = d.path_image_final.replace("\\", "/") if d.path_image_final else ""
        resultat.append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "medecin": d.nom_medecin_diagnostiqueur,
            "date": d.date_diagnostique,
            "image_url": clean_url,
            "image_hash": d.image_hash,
            "utilisateur_id": d.utilisateur_id
<<<<<<< Updated upstream
=======
        })
    return resultat

@app.get("/api/diagnostics/user/{user_id}")
def get_user_diagnostics(user_id: int, db: Session = Depends(get_db)):
    diagnostics = db.query(models.Diagnostic).filter(
        models.Diagnostic.utilisateur_id == user_id
    ).order_by(models.Diagnostic.id.desc()).all()
    
    resultat = []
    for d in diagnostics:
        clean_url = d.path_image_final.replace("\\", "/") if d.path_image_final else ""
        resultat.append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "medecin": d.nom_medecin_diagnostiqueur,
            "date": d.date_diagnostique,
            "image_url": clean_url,
            "image_hash": d.image_hash,
            "utilisateur_id": d.utilisateur_id,
            "nom_image_originale": d.nom_image_originale,
            "nom_image_renommee": d.nom_image_renommee
>>>>>>> Stashed changes
        })
    return resultat


@app.get("/api/diagnostics/user/{user_id}")
def get_user_diagnostics(user_id: int, db: Session = Depends(get_db)):
    """Récupère tous les diagnostics d'un utilisateur spécifique"""
    diagnostics = db.query(models.Diagnostic).filter(
        models.Diagnostic.utilisateur_id == user_id
    ).order_by(models.Diagnostic.id.desc()).all()
    
    resultat = []
    for d in diagnostics:
        clean_url = d.path_image_final.replace("\\", "/") if d.path_image_final else ""
        resultat.append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "medecin": d.nom_medecin_diagnostiqueur,
            "date": d.date_diagnostique,
            "image_url": clean_url,
            "image_hash": d.image_hash,
            "utilisateur_id": d.utilisateur_id,
            "nom_image_originale": d.nom_image_originale,
            "nom_image_renommee": d.nom_image_renommee
        })
    return resultat


@app.post("/api/diagnostic/")
async def create_diagnostic(
    file: UploadFile = File(...),
    nom_maladie: str = Form(...),
    type_maladie: str = Form(...),
    utilisateur_id: int = Form(...),
    nom_medecin_diagnostiqueur: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        image_bytes = await file.read()
        sha256_hash = hashlib.sha256(image_bytes).hexdigest()

<<<<<<< Updated upstream
        avis_existants = db.query(models.Diagnostic).filter(
            models.Diagnostic.image_hash == sha256_hash
        ).all()

        if avis_existants:
            if any(avis.utilisateur_id == utilisateur_id for avis in avis_existants):
                raise HTTPException(status_code=400, detail="Vous avez deja donne un avis pour cette image")

=======
        # 1. Vérifier si CET utilisateur a déjà donné un avis sur CETTE image
        deja_expertise = db.query(models.Diagnostic).filter(
            models.Diagnostic.image_hash == sha256_hash,
            models.Diagnostic.utilisateur_id == utilisateur_id
        ).first()

        if deja_expertise:
            deja_expertise.nom_maladie = nom_maladie
            deja_expertise.type_maladie = type_maladie
            deja_expertise.date_insertion_bdd = datetime.datetime.now()
            db.commit()
            return {"status": "success", "message": "Avis mis à jour", "path": deja_expertise.path_image_final}

        # 2. Vérifier si l'image physique existe déjà (postée par un autre)
        avis_existants = db.query(models.Diagnostic).filter(
            models.Diagnostic.image_hash == sha256_hash
        ).all()
        
        if avis_existants:
>>>>>>> Stashed changes
            avis_count = len(avis_existants)
            if avis_count >= 3:
                raise HTTPException(status_code=400, detail="Cette image a deja 3 avis")

            if avis_count == 2:
                keys = {avis_key(avis) for avis in avis_existants}
                if len(keys) == 1:
<<<<<<< Updated upstream
                    raise HTTPException(status_code=400, detail="Cette image a deja 2 avis identiques")
=======
                    # Si les deux avis existants sont identiques, on vérifie si le nouveau est aussi identique
                    nouveau_key = f"{normalize_avis_value(nom_maladie)}::{normalize_avis_value(type_maladie)}"
                    if nouveau_key in keys:
                        raise HTTPException(status_code=400, detail="Cette image a deja 2 avis identiques")
>>>>>>> Stashed changes

        original_filename = file.filename or "uploaded_file"

        if avis_existants:
            nom_renomme_final = avis_existants[0].nom_image_renommee
            path_final_bdd = avis_existants[0].path_image_final
            message_retour = "Avis ajouté à l'image existante"
        else:
            maladie_part = sanitize_part(nom_maladie, "inconnue")
            type_part = sanitize_part(type_maladie or "standard", "standard")
<<<<<<< Updated upstream
            compteur_classe = db.query(models.Diagnostic).filter(
                models.Diagnostic.nom_maladie == nom_maladie
            ).count() + 1
            nom_renomme_final = f"{maladie_part}_{type_part}_m{utilisateur_id}_{compteur_classe}.jpg"
            path_final_bdd = f"uploads/classes/{nom_renomme_final}"

            path_physique_original = os.path.join(DIR_ORIGINAUX, original_filename)
=======
            compteur_classe = db.query(func.count(func.distinct(models.Diagnostic.image_hash))).scalar() + 1
            nom_renomme_final = f"{maladie_part}_{type_part}_m{utilisateur_id}_{compteur_classe}.jpg"
            path_final_bdd = f"uploads/classes/{nom_renomme_final}"

            path_physique_original = os.path.join(DIR_ORIGINAUX, f"{sha256_hash[:10]}_{original_filename}")
>>>>>>> Stashed changes
            with open(path_physique_original, "wb") as f_orig:
                f_orig.write(image_bytes)

            path_physique_classe = os.path.join(DIR_CLASSES, nom_renomme_final)
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img.save(path_physique_classe, "JPEG", quality=90)
            message_retour = "Nouveau diagnostic enregistré"

        nouveau_diag = models.Diagnostic(
            nom_maladie=nom_maladie,
            type_maladie=type_maladie,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            utilisateur_id=utilisateur_id,
            nom_image_originale=original_filename,
            nom_image_renommee=nom_renomme_final,
            path_image_final=path_final_bdd,
            image_hash=sha256_hash,
            date_diagnostique=datetime.date.today(),
            date_insertion_bdd=datetime.datetime.now()
        )

        db.add(nouveau_diag)
        db.commit()
<<<<<<< Updated upstream

        return {"status": "success", "message": message_retour}
=======
        return {"status": "success", "message": message_retour, "path": path_final_bdd}
>>>>>>> Stashed changes

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/diagnostic/{diag_id}")
async def update_diagnostic(diag_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    diagnostic = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
<<<<<<< Updated upstream

    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")

    if diagnostic.utilisateur_id != data.get("utilisateur_id"):
        raise HTTPException(status_code=403, detail="Vous pouvez seulement modifier ou supprimer vos images / contenus")

=======
    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
>>>>>>> Stashed changes
    try:
        diagnostic.nom_maladie = data.get("nom_maladie", diagnostic.nom_maladie)
        diagnostic.type_maladie = data.get("type_maladie", diagnostic.type_maladie)
        db.commit()
        return {"status": "success", "message": "Diagnostic mis à jour"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/diagnostic/{diag_id}")
async def delete_diagnostic(diag_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    diagnostic = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()

    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")

    if diagnostic.utilisateur_id != data.get("utilisateur_id"):
        raise HTTPException(status_code=403, detail="Vous pouvez seulement modifier ou supprimer vos images / contenus")

    try:
        image_hash = diagnostic.image_hash
        image_path = diagnostic.path_image_final

        db.delete(diagnostic)
        db.commit()

        if image_hash:
            remaining = db.query(models.Diagnostic).filter(
                models.Diagnostic.image_hash == image_hash
            ).count()

            if remaining == 0 and image_path:
                file_path = os.path.join(BASE_DIR, image_path)
                if os.path.exists(file_path):
                    os.remove(file_path)

        return {"status": "success", "message": "Diagnostic supprimé"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
<<<<<<< Updated upstream
    email = data.get('email')
    password = data.get('mot_de_passe') or data.get('password')

    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email inconnu")

    if user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

=======
    email = data.get('email', '').strip()
    password = data.get('mot_de_passe') or data.get('password')
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user or user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
>>>>>>> Stashed changes
    return {"id": user.id, "nom": user.nom, "prenom": user.prenom, "email": user.email}


@app.post("/api/verifier-mdp")
def verifier_mot_de_passe(data: dict, db: Session = Depends(get_db)):
    utilisateur_id = data.get("utilisateur_id")
    mot_de_passe = data.get("mot_de_passe")
    
<<<<<<< Updated upstream
    logger.info(f"Vérification mot de passe pour utilisateur_id: {utilisateur_id}")
    
    user = db.query(models.Utilisateur).filter(
        models.Utilisateur.id == utilisateur_id
    ).first()

    if not user:
        logger.error(f"Utilisateur {utilisateur_id} introuvable")
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    
    # Comparaison simple des mots de passe
    if user.mot_de_passe != mot_de_passe:
        logger.error(f"Mot de passe incorrect pour utilisateur {utilisateur_id}")
        logger.debug(f"Attendu: '{user.mot_de_passe}' / Reçu: '{mot_de_passe}'")
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    logger.info(f"Mot de passe vérifié avec succès pour utilisateur {utilisateur_id}")
    return {"status": "success"}

=======
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == utilisateur_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    
    if user.mot_de_passe != mot_de_passe:
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
    return list(grouped.values())
>>>>>>> Stashed changes

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
