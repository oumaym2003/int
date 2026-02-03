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
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os, logging, datetime, hashlib, re, io
import models, database

app = FastAPI()

# --- 1. CONFIGURATION CORS ---
# On autorise tout pour le développement afin d'éviter les blocages React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. DEPENDANCE DB ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 3. ROUTE LOGIN ---
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

# --- 4. RÉCUPÉRER TOUS LES DIAGNOSTICS (Pour la liste React) ---
@app.get("/api/diagnostics")
def get_all_diagnostics(db: Session = Depends(get_db)):
    # Récupération triée par date d'insertion décroissante
    diagnostics = db.query(models.Diagnostic).order_by(models.Diagnostic.date_insertion_bdd.desc()).all()
    
    return [{
        "id": d.id,
        "nom_maladie": d.nom_maladie,
        "type_maladie": d.type_maladie,
        "medecin": d.nom_medecin_diagnostiqueur,
        "date": d.date_diagnostic,
        "image_url": f"/api/image/{d.id}" 
    } for d in diagnostics]

# --- 5. MODIFIER UN DIAGNOSTIC ---
@app.put("/api/diagnostic/{diag_id}")
def update_diagnostic(diag_id: int, data: dict, db: Session = Depends(get_db)):
    diag = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
    
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    
    # Mise à jour via les données envoyées par React (noms de clés adaptés)
    diag.nom_maladie = data.get("nom_maladie", diag.nom_maladie)
    diag.type_maladie = data.get("type_maladie", diag.type_maladie)
        
    db.commit()
    return {"status": "success", "message": "Annotation mise à jour"}

# --- 6. CRÉER UN DIAGNOSTIC (Upload) ---
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

        extension = os.path.splitext(file.filename)[1]
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        nom_renomme = f"{nom_maladie.lower()}_{utilisateur_id}_{timestamp}{extension}"

        nouveau_diag = models.Diagnostic(
            nom_maladie=nom_maladie,
            type_maladie=type_maladie,
            nom_medecin_diagnostiqueur=nom_medecin_diagnostiqueur,
            utilisateur_id=utilisateur_id,
            image_blob=image_bytes, # Stockage binaire direct
            nom_image_originale=file.filename,
            nom_image_renommee=nom_renomme,
            image_hash=sha256_hash,
            path_image_contour="",
            date_diagnostic=datetime.date.today(),
            date_insertion_bdd=datetime.datetime.now()
        )
        
        db.add(nouveau_diag)
        db.commit()
        db.refresh(nouveau_diag)

        return {"status": "success", "id": nouveau_diag.id}

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur Upload : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 7. AFFICHER L'IMAGE ---
@app.get("/api/image/{diag_id}")
async def get_diagnostic_image(diag_id: int, db: Session = Depends(get_db)):
    diag = db.query(models.Diagnostic).filter(models.Diagnostic.id == diag_id).first()
    if not diag or not diag.image_blob:
        raise HTTPException(status_code=404, detail="Image non trouvée")
    
    return Response(content=diag.image_blob, media_type="image/jpeg")

# --- ROUTE DE VÉRIFICATION DE MOT DE PASSE ---
@app.post("/api/verifier-mdp")
def verifier_mot_de_passe(data: dict, db: Session = Depends(get_db)):
    user_id = data.get("utilisateur_id")
    password_a_verifier = data.get("mot_de_passe")
    
    user = db.query(models.Utilisateur).filter(models.Utilisateur.id == user_id).first()
    
    if not user or user.mot_de_passe != password_a_verifier:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    return {"status": "success", "message": "Mot de passe valide"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)