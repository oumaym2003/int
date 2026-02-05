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
from PIL import Image

import models  # type: ignore
import database  # type: ignore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
DIR_ORIGINAUX = os.path.join(UPLOAD_ROOT, "originaux")
DIR_CLASSES = os.path.join(UPLOAD_ROOT, "classes")

os.makedirs(DIR_ORIGINAUX, exist_ok=True)
os.makedirs(DIR_CLASSES, exist_ok=True)

app = FastAPI(redirect_slashes=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def sanitize_part(value: str, fallback: str) -> str:
    if not value:
        return fallback
    cleaned = value.strip().lower()
    cleaned = (
        cleaned.replace(" ", "_")
        .replace("+", "plus")
        .replace("/", "-")
        .replace("\\", "-")
        .replace(":", "-")
    )
    cleaned = re.sub(r"[^a-z0-9_-]+", "", cleaned)
    return cleaned or fallback


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


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

        image_existante = db.query(models.Diagnostic).filter(
            models.Diagnostic.image_hash == sha256_hash
        ).first()

        original_filename = file.filename or "uploaded_file"

        if image_existante:
            nom_renomme_final = image_existante.nom_image_renommee
            path_final_bdd = image_existante.path_image_final
            message_retour = "Avis ajouté à l'image existante"
        else:
            maladie_part = sanitize_part(nom_maladie, "inconnue")
            type_part = sanitize_part(type_maladie or "standard", "standard")
            compteur_classe = db.query(models.Diagnostic).filter(
                models.Diagnostic.nom_maladie == nom_maladie
            ).count() + 1
            nom_renomme_final = f"{maladie_part}_{type_part}_m{utilisateur_id}_{compteur_classe}.jpg"
            path_final_bdd = f"uploads/classes/{nom_renomme_final}"

            path_physique_original = os.path.join(DIR_ORIGINAUX, original_filename)
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

        return {"status": "success", "message": message_retour}

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/diagnostic/{diag_id}")
async def update_diagnostic(diag_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    diagnostic = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()

    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")

    if diagnostic.utilisateur_id != data.get("utilisateur_id"):
        raise HTTPException(status_code=403, detail="Vous pouvez seulement modifier ou supprimer vos images / contenus")

    try:
        diagnostic.nom_maladie = data.get("nom_maladie", diagnostic.nom_maladie)
        diagnostic.type_maladie = data.get("type_maladie", diagnostic.type_maladie)
        db.commit()
        return {"status": "success", "message": "Mise à jour réussie"}
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
    email = data.get('email')
    password = data.get('mot_de_passe') or data.get('password')

    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email inconnu")

    if user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return {"id": user.id, "nom": user.nom, "prenom": user.prenom, "email": user.email}


@app.post("/api/verifier-mdp")
def verifier_mot_de_passe(data: dict, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(
        models.Utilisateur.id == data.get("utilisateur_id")
    ).first()

    if not user or user.mot_de_passe != data.get("mot_de_passe"):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
