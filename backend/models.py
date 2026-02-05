from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100))
    prenom = Column(String(100))
    email = Column(String(150), unique=True, index=True)
    mot_de_passe = Column(String(255))
    
    # Optionnel : permet d'accéder aux diagnostics d'un utilisateur facilement
    diagnostics = relationship("Diagnostic", back_populates="proprietaire")

class Diagnostic(Base):
    __tablename__ = "diagnostics"
    # Correction : primary_key en minuscules
    id = Column(Integer, primary_key=True, index=True) 
    nom_maladie = Column(String(150))
    type_maladie = Column(String(100))
    nom_image_originale = Column(Text)
    nom_image_renommee = Column(Text)
    path_image_contour = Column(Text)
    path_image_final = Column(String(255)) 
    
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"))
    nom_medecin_diagnostiqueur = Column(String(150))
    
    date_prise_image = Column(Date)
    date_diagnostique = Column(Date)
    # Correction : utilisation de datetime.datetime.now pour plus de simplicité avec MySQL
    date_insertion_bdd = Column(DateTime, default=datetime.datetime.now)
    image_hash = Column(String(64))

    # Lien vers l'utilisateur
    proprietaire = relationship("Utilisateur", back_populates="diagnostics")
    
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



