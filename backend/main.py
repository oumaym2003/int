"""import os
from fastapi.middleware.cors import CORSMiddleware
import hashlib
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import database

# Créer les tables au démarrage
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI() # Cela définit "app"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Autorise ton interface React
    allow_credentials=True,
    allow_methods=["*"], # Autorise toutes les méthodes (POST, GET, etc.)
    allow_headers=["*"], # Autorise tous les headers
)
# Cette fonction permet d'ouvrir une connexion à la base de données 
# et de la fermer automatiquement une fois la requête terminée.
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/login")
def login(credentials: dict, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == credentials.get("email")
    ).first()

    # Utilise credentials.get("mot_de_passe") car c'est ce que React envoie
    if not user or user.mot_de_passe != credentials.get("mot_de_passe"):
        raise HTTPException(
            status_code=401, 
            detail="Accès refusé : Identifiants inconnus"
        )

    # RECURER L'ID ICI EST CRUCIAL
    return {
        "id": user.id,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email
    }

UPLOAD_DIR = "D:/pfe-2026/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/diagnostic/")
async def create_diagnostic(
    file: UploadFile = File(...),
    nom_maladie: str = Form(...),
    type_maladie: str = Form(...),
    utilisateur_id: int = Form(...),
    nom_medecin_diagnostique: str = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Lire le contenu pour générer le Hash (identifiant unique de l'image)
    contents = await file.read()
    image_hash = hashlib.sha256(contents).hexdigest()
    
    # 2. Gérer les noms de fichiers
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nom_image_renommee = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, nom_image_renommee)

    # 3. Sauvegarder le fichier physiquement sur le disque D:
    with open(file_path, "wb") as f:
        f.write(contents)

    # 4. Enregistrer dans PostgreSQL
    nouveau_diag = models.Diagnostic(
        nom_maladie=nom_maladie,
        type_maladie=type_maladie,
        path_image_originale=file.filename,
        path_image_renommee=file_path,
        utilisateur_id=utilisateur_id,
        nom_medecin_diagnostique=nom_medecin_diagnostique,
        image_hash=image_hash
    )
    
    db.add(nouveau_diag)
    db.commit()
    db.refresh(nouveau_diag)

    return {"status": "success", "id": nouveau_diag.id}




from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Import manquant dans ton test
from sqlalchemy.orm import Session
import schemas, crud, database, auth, models 

app = FastAPI()

# --- 1. AJOUTER LE CORS ICI (OBLIGATOIRE) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):
    # Vérifier si l'email existe déjà
    user_existant = db.query(models.Utilisateur).filter(
        models.Utilisateur.email == data.get('email')
    ).first()
    
    if user_existant:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Créer un nouvel utilisateur
    nouvel_utilisateur = models.Utilisateur(
        nom=data.get('nom'),
        prenom=data.get('prenom'),
        email=data.get('email'),
        mot_de_passe=data.get('mot_de_passe')
    )
    
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)
    
    return {
        "message": "Inscription réussie",
        "user": {
            "id": nouvel_utilisateur.id,
            "nom": nouvel_utilisateur.nom,
            "prenom": nouvel_utilisateur.prenom,
            "email": nouvel_utilisateur.email
        }
    }

@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == data.get('email')).first()
    
    # Correction : On vérifie bien 'mot_de_passe' envoyé par React
    if not user or user.mot_de_passe != data.get('mot_de_passe'):
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")
        
    return {
        "message": "Connexion réussie", 
        "user": {
            "id": user.id,      # <--- INDISPENSABLE pour le diagnostic !
            "nom": user.nom, 
            "prenom": user.prenom
        }
    }

app.include_router(router)
import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles # Pour servir React
from fastapi.responses import FileResponse # Pour servir l'index.html
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import models, database

app = FastAPI()

# Même si on est sur le même port, on garde ça par sécurité pour le dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTES API ---

@app.post("/api/login")
def login(data: dict, db: Session = Depends(database.get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == data.get('email')).first()
    if not user or user.mot_de_passe != data.get('mot_de_passe'):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    return {"id": user.id, "nom": user.nom, "prenom": user.prenom}



from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, APIRouter,Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os, hashlib, datetime
import models, database
from sqlalchemy.orm import Session # Assure-toi que Session est bien là

app = FastAPI()

# 1. CONFIGURATION CORS (A mettre IMPÉRATIVEMENT avant les routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ton frontend React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. DEPENDANCE DB
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 3. ROUTE LOGIN
@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    email = data.get('email')
    password = data.get('mot_de_passe')
    
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    
    if not user or user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        
    return {
        "id": user.id,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email
    }

# 4. ROUTE DIAGNOSTIC (Ajoutée ici pour tout centraliser)
UPLOAD_DIR = "static/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)
import logging

# Configuration pour voir les erreurs dans le terminal
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
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
        contents = await file.read()
        image_hash = hashlib.sha256(contents).hexdigest()

        # --- NOUVELLE LOGIQUE DU COMPTEUR PAR CLASSE ---
        # On compte combien de diagnostics existent déjà pour CETTE maladie précise
        compteur_classe = db.query(models.Diagnostic).filter(
            models.Diagnostic.nom_maladie == nom_maladie
        ).count() + 1
        # -----------------------------------------------

        # Nettoyage des noms pour le système de fichiers
        maladie_clean = nom_maladie.replace(" ", "_").replace("+", "plus")
        type_clean = type_maladie.replace(" ", "_")
        extension = os.path.splitext(file.filename)[1]

        # Nouveau nom : Maladie_Type_UserID_CompteurDeClasse.ext
        nouveau_nom_fichier = f"{maladie_clean}_{type_clean}_{utilisateur_id}_{compteur_classe}{extension}"

        current_dir = os.path.dirname(os.path.abspath(__file__))
        upload_path = os.path.join(current_dir, "images_diagnostics")
        os.makedirs(upload_path, exist_ok=True)
        
        full_file_path = os.path.join(upload_path, nouveau_nom_fichier)

        with open(full_file_path, "wb") as f:
            f.write(contents)

        nouveau_diag = models.Diagnostic(
            nom_maladie=nom_maladie,
            type_maladie=type_maladie,
            path_image_originale=file.filename,
            path_image_renommee=nouveau_nom_fichier,
            utilisateur_id=utilisateur_id,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            image_hash=image_hash
        )
        
        db.add(nouveau_diag)
        db.commit()
        db.refresh(nouveau_diag)
        
        return {"status": "success", "nom_fichier": nouveau_nom_fichier, "classe_count": compteur_classe}

    except Exception as e:
        db.rollback()
        logger.error(f"ERREUR : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
"""
import os
import hashlib
import datetime
import io
import logging
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from PIL import Image

import models
import database

# --- 1. CONFIGURATION STRICTE DES CHEMINS ---
# On récupère le chemin absolu du dossier où se trouve main.py (le dossier backend)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# On définit les sous-dossiers à l'intérieur de 'uploads'
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
DIR_ORIGINAUX = os.path.join(UPLOAD_ROOT, "originaux")
DIR_CLASSES = os.path.join(UPLOAD_ROOT, "classes")

# Création automatique et récursive des dossiers
os.makedirs(DIR_ORIGINAUX, exist_ok=True)
os.makedirs(DIR_CLASSES, exist_ok=True)

app = FastAPI()

# --- 2. CONFIGURATION DU SERVEUR DE FICHIERS STATIQUES ---
# On expose le dossier 'uploads' pour que http://127.0.0.1:8000/uploads/ soit valide
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

# --- 3. CONFIGURATION CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. LOGGING ET DB ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 5. ROUTES ---

@app.get("/api/diagnostics")
def get_all_diagnostics(db: Session = Depends(get_db)):
    diagnostics = db.query(models.Diagnostic).order_by(models.Diagnostic.id.desc()).all()
    
    resultat = []
    for d in diagnostics:
        # On n'envoie que le chemin relatif sans le http://...
        # Exemple: "uploads/classes/image.jpg"
        clean_url = d.path_image_final.replace("\\", "/") if d.path_image_final else ""

        resultat.append({
            "id": d.id,
            "nom_maladie": d.nom_maladie,
            "type_maladie": d.type_maladie,
            "medecin": d.nom_medecin_diagnostiqueur,
            "date": d.date_diagnostique,
            "image_url": clean_url # On envoie juste le chemin ici
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
        # 1. Lire le contenu et générer le Hash (Empreinte digitale de l'image)
        image_bytes = await file.read()
        sha256_hash = hashlib.sha256(image_bytes).hexdigest()

        # 2. VÉRIFICATION DE DUPLICATION
        image_existante = db.query(models.Diagnostic).filter(models.Diagnostic.image_hash == sha256_hash).first()
        
        if image_existante:
            # Si l'image existe déjà, on renvoie une erreur 400
            raise HTTPException(
                status_code=400, 
                detail=f"Cette image a déjà été diagnostiquée (ID: {image_existante.id}, Maladie: {image_existante.nom_maladie})"
            )

        # 3. Si l'image est nouvelle, on continue le processus...
        compte = db.query(models.Diagnostic).filter(models.Diagnostic.nom_maladie == nom_maladie).count()
        nouveau_numero = compte + 1

        # Nettoyage des noms (pour éviter les problèmes d'accents/espaces)
        nom_base = nom_maladie.lower().replace(" ", "_")
        type_base = type_maladie.lower().replace(" ", "_")
        nom_renomme_final = f"{nom_base}_{type_base}_{utilisateur_id}_{nouveau_numero}.jpg"

        # Sauvegarde des fichiers
        path_physique_original = os.path.join(DIR_ORIGINAUX, file.filename)
        with open(path_physique_original, "wb") as f_orig:
            f_orig.write(image_bytes)

        path_physique_classe = os.path.join(DIR_CLASSES, nom_renomme_final)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.save(path_physique_classe, "JPEG", quality=90)

        # Insertion en BDD
        nouveau_diag = models.Diagnostic(
            nom_maladie=nom_maladie,
            type_maladie=type_maladie,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            utilisateur_id=utilisateur_id,
            nom_image_originale=file.filename,
            nom_image_renommee=nom_renomme_final,
            path_image_final=f"uploads/classes/{nom_renomme_final}",
            image_hash=sha256_hash, # On stocke le hash ici
            date_diagnostique=datetime.date.today(),
            date_insertion_bdd=datetime.datetime.now()
        )
        
        db.add(nouveau_diag)
        db.commit()
        
        return {"status": "success", "message": "Nouveau diagnostic enregistré"}

    except HTTPException as he:
        raise he # On laisse passer l'erreur 400 de duplication
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    email = data.get('email')
    password = data.get('mot_de_passe')
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if not user or user.mot_de_passe != password:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {"id": user.id, "nom": user.nom, "prenom": user.prenom, "email": user.email}

@app.post("/api/verifier-mdp")
def verifier_mot_de_passe(data: dict, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == data.get("utilisateur_id")).first()
    if not user or user.mot_de_passe != data.get("mot_de_passe"):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)