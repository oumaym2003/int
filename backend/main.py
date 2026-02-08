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
try:
    from . import auth
    from . import models  # type: ignore
    from . import database  # type: ignore
except ImportError:
    import auth
    import models  # type: ignore
    import database  # type: ignore

# --- CONFIGURATION DES RÉPERTOIRES ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
DIR_ORIGINAUX = os.path.join(UPLOAD_ROOT, "originaux")
DIR_CLASSES = os.path.join(UPLOAD_ROOT, "classes")

os.makedirs(DIR_ORIGINAUX, exist_ok=True)
os.makedirs(DIR_CLASSES, exist_ok=True)

app = FastAPI(redirect_slashes=True)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}


class CORSStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        origin = None
        for key, value in scope.get("headers", []):
            if key == b"origin":
                origin = value.decode("utf-8")
                break
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response


app.mount("/uploads", CORSStaticFiles(directory=UPLOAD_ROOT), name="uploads")


@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS and "access-control-allow-origin" not in response.headers:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers.setdefault("Vary", "Origin")
    return response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- UTILITAIRES ---
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

def normalize_avis_value(value: str) -> str:
    if not value:
        return ""
    return " ".join(value.strip().lower().split())

def normalize_input_value(value: str) -> str:
    if not value:
        return ""
    return " ".join(str(value).strip().split())

def normalize_type_input(value: str) -> str:
    normalized = normalize_input_value(value)
    return normalized or "Standard"

def avis_key(avis: models.Diagnostic) -> str:
    nom = normalize_avis_value(avis.nom_maladie)
    type_maladie = normalize_avis_value(avis.type_maladie)
    return f"{nom}::{type_maladie}"

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ROUTES ---

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
            "utilisateur_id": d.utilisateur_id,
            "nom_medecin_diagnostiqueur_2": d.nom_medecin_diagnostiqueur_2,
            "diagnostique_2": d.diagnostique_2,
            "type_maladie_2": d.type_maladie_2,
            "utilisateur_id_2": d.utilisateur_id_2
        })
    return resultat

@app.get("/api/diagnostics/user/{user_id}")
def get_user_diagnostics(user_id: int, db: Session = Depends(get_db)):
    """Récupère tous les diagnostics d'un utilisateur spécifique"""
    diagnostics = db.query(models.Diagnostic).filter(
        (models.Diagnostic.utilisateur_id == user_id) | (models.Diagnostic.utilisateur_id_2 == user_id)
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
            "nom_medecin_diagnostiqueur_2": d.nom_medecin_diagnostiqueur_2,
            "diagnostique_2": d.diagnostique_2,
            "type_maladie_2": d.type_maladie_2,
            "utilisateur_id_2": d.utilisateur_id_2,
            "nom_image_originale": d.nom_image_originale,
            "nom_image_renommee": d.nom_image_renommee
        })
    return resultat

@app.post("/api/diagnostic/")
async def create_diagnostic(
    # Le fichier devient optionnel (None) pour permettre l'ajout d'avis par hash
    file: UploadFile = File(None), 
    nom_maladie: str = Form(...),
    type_maladie: str = Form(...),
    utilisateur_id: int = Form(...),
    nom_medecin_diagnostiqueur: str = Form(...),
    nom_medecin_diagnostiqueur_2: str = Form(None),
    diagnostique_2: str = Form(None),
    # On ajoute ce champ pour recevoir le hash depuis React
    image_hash_existant: str = Form(None), 
    db: Session = Depends(get_db)
):
    try:
        nom_maladie = normalize_input_value(nom_maladie)
        type_maladie = normalize_type_input(type_maladie)
        nom_medecin_diagnostiqueur_2 = normalize_input_value(nom_medecin_diagnostiqueur_2) if nom_medecin_diagnostiqueur_2 else ""
        diagnostique_2 = normalize_input_value(diagnostique_2) if diagnostique_2 else ""

        sha256_hash = None
        image_bytes = None

        # --- ÉTAPE 1 : RÉCUPÉRATION DU HASH ---
        if image_hash_existant:
            # Cas ajout d'avis sur une image déjà présente
            sha256_hash = image_hash_existant
        elif file:
            # Cas nouvelle image uploadée
            image_bytes = await file.read()
            sha256_hash = hashlib.sha256(image_bytes).hexdigest()
        else:
            raise HTTPException(status_code=400, detail="Fichier ou Hash manquant")

        # --- ÉTAPE 2 : VÉRIFICATIONS (DÉJÀ EXPERTISÉ) ---
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

        # --- ÉTAPE 3 : VÉRIFICATION DU NOMBRE D'AVIS ---
        avis_existants = db.query(models.Diagnostic).filter(
            models.Diagnostic.image_hash == sha256_hash
        ).all()

        if avis_existants:
            avis_count = len(avis_existants)
            if avis_count >= 3:
                raise HTTPException(status_code=400, detail="Cette image a déjà 3 avis")

            if avis_count == 1:
                diag = avis_existants[0]
                if diag.utilisateur_id_2 or diag.nom_medecin_diagnostiqueur_2 or diag.diagnostique_2:
                    raise HTTPException(status_code=400, detail="Le 2e avis est déjà enregistré")

                diag.utilisateur_id_2 = utilisateur_id
                diag.nom_medecin_diagnostiqueur_2 = nom_medecin_diagnostiqueur
                diag.diagnostique_2 = nom_maladie
                diag.type_maladie_2 = type_maladie
                diag.date_insertion_bdd = datetime.datetime.now()
                db.commit()
                return {"status": "success", "message": "2e avis ajouté", "path": diag.path_image_final}

            if avis_count == 1:
                diag = avis_existants[0]
                if diag.nom_medecin_diagnostiqueur_2 or diag.diagnostique_2:
                    raise HTTPException(status_code=400, detail="Le 2e avis est déjà enregistré")

                diag.nom_medecin_diagnostiqueur_2 = nom_medecin_diagnostiqueur_2 or nom_medecin_diagnostiqueur
                diag.diagnostique_2 = diagnostique_2 or nom_maladie
                diag.date_insertion_bdd = datetime.datetime.now()
                db.commit()
                return {"status": "success", "message": "2e avis ajouté", "path": diag.path_image_final}

            # Vérification de la validation (2 avis identiques)
            if avis_count == 2:
                # Utilise vos fonctions de normalisation existantes
                keys = {f"{normalize_avis_value(a.nom_maladie)}::{normalize_avis_value(a.type_maladie)}" for a in avis_existants}
                nouveau_key = f"{normalize_avis_value(nom_maladie)}::{normalize_avis_value(type_maladie)}"
                if len(keys) == 1 and nouveau_key in keys:
                    raise HTTPException(status_code=400, detail="Cette image est déjà validée (2 avis identiques)")

        # --- ÉTAPE 4 : GESTION DES FICHIERS ---
        if avis_existants:
            # On réutilise les informations de l'image existante
            original_filename = avis_existants[0].nom_image_originale
            nom_renomme_final = avis_existants[0].nom_image_renommee
            path_final_bdd = avis_existants[0].path_image_final
            message_retour = "Avis ajouté à l'image existante"
        else:
            # C'est une toute nouvelle image, il faut la sauvegarder physiquement
            if not image_bytes:
                 raise HTTPException(status_code=400, detail="Fichier requis pour un nouveau diagnostic")
            
            original_filename = file.filename or "uploaded_file"
            maladie_part = sanitize_part(nom_maladie, "inconnue")
            type_part = sanitize_part(type_maladie or "standard", "standard")
            
            # Compteur pour le renommage
            compteur_classe = db.query(func.count(func.distinct(models.Diagnostic.image_hash))).scalar() + 1
            nom_renomme_final = f"{maladie_part}_{type_part}_m{utilisateur_id}_{compteur_classe}.jpg"
            path_final_bdd = f"uploads/classes/{nom_renomme_final}"

            # Sauvegarde physique
            path_physique_original = os.path.join(DIR_ORIGINAUX, f"{sha256_hash[:10]}_{original_filename}")
            with open(path_physique_original, "wb") as f_orig:
                f_orig.write(image_bytes)

            path_physique_classe = os.path.join(DIR_CLASSES, nom_renomme_final)
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img.save(path_physique_classe, "JPEG", quality=90)
            message_retour = "Nouveau diagnostic enregistré"

        # --- ÉTAPE 5 : ENREGISTREMENT BDD ---
        nouveau_diag = models.Diagnostic(
            nom_maladie=nom_maladie,
            type_maladie=type_maladie,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            utilisateur_id=utilisateur_id,
            nom_medecin_diagnostiqueur_2=None,
            diagnostique_2=None,
            type_maladie_2=None,
            utilisateur_id_2=None,
            nom_image_originale=original_filename,
            nom_image_renommee=nom_renomme_final,
            path_image_final=path_final_bdd,
            image_hash=sha256_hash,
            date_diagnostique=datetime.date.today(),
            date_insertion_bdd=datetime.datetime.now()
        )

        db.add(nouveau_diag)
        db.commit()
        return {"status": "success", "message": message_retour, "path": path_final_bdd}

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"Erreur : {str(e)}") # logger.error si vous avez configuré le logger
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@app.put("/api/diagnostic/{diag_id}")
async def update_diagnostic(diag_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    diagnostic = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
    if not diagnostic:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    
    # Vérification de sécurité (optionnelle selon votre logique originale)
    is_second = bool(data.get("is_second"))
    user_id = data.get("utilisateur_id")
    if user_id and not is_second and diagnostic.utilisateur_id != user_id:
         raise HTTPException(status_code=403, detail="Non autorisé")
    if user_id and is_second and diagnostic.utilisateur_id_2 != user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")

    try:
        if is_second:
            if "nom_maladie" in data:
                diagnostic.diagnostique_2 = normalize_input_value(data.get("nom_maladie"))
            if "type_maladie" in data:
                diagnostic.type_maladie_2 = normalize_type_input(data.get("type_maladie"))
        else:
            if "nom_maladie" in data:
                diagnostic.nom_maladie = normalize_input_value(data.get("nom_maladie"))
            if "type_maladie" in data:
                diagnostic.type_maladie = normalize_type_input(data.get("type_maladie"))
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

    is_second = bool(data.get("is_second"))
    user_id = data.get("utilisateur_id")
    if not is_second and diagnostic.utilisateur_id != user_id:
        raise HTTPException(status_code=403, detail="Vous pouvez seulement modifier ou supprimer vos images / contenus")
    if is_second and diagnostic.utilisateur_id_2 != user_id:
        raise HTTPException(status_code=403, detail="Vous pouvez seulement modifier ou supprimer vos images / contenus")

    try:
        if is_second:
            diagnostic.utilisateur_id_2 = None
            diagnostic.nom_medecin_diagnostiqueur_2 = None
            diagnostic.diagnostique_2 = None
            diagnostic.type_maladie_2 = None
            db.commit()
            return {"status": "success", "message": "2e avis supprimé"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)