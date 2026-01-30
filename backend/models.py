from sqlalchemy import Column, Integer, String, LargeBinary, DateTime, Date
from database import Base
import datetime

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String)
    prenom = Column(String)
    email = Column(String, unique=True, index=True)
    mot_de_passe = Column(String)

class Diagnostic(Base):
    __tablename__ = "diagnostics"
    id = Column(Integer, primary_key=True, index=True)
    nom_maladie = Column(String(150))
    type_maladie = Column(String(100))
    nom_image_originale = Column(String) 
    nom_image_renommee = Column(String)
    path_image_contour = Column(String)
    utilisateur_id = Column(Integer)
    nom_medecin_diagnostiqueur = Column(String)
    date_prise_image = Column(Date)
    date_diagnostic = Column(Date)
    date_insertion_bdd = Column(DateTime, default=datetime.datetime.utcnow)
    image_hash = Column(String(64), unique=True) # Unique pour éviter les doublons
    image_blob = Column(LargeBinary)
    
"""class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id = Column(Integer, primary_key=True, index=True)
    nom_maladie = Column(String)
    type_maladie = Column(String)
    path_image_originale = Column(String)
    path_image_renommee = Column(String)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"))
    image_hash = Column(String)
    date_insertion_bdd = Column(DateTime, default=datetime.datetime.utcnow)
    
    # AJOUTE CETTE LIGNE EXACTEMENT ICI :
    nom_medecin_diagnostiqueur = Column(String)"""



