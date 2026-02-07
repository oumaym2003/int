from sqlalchemy.orm import Session
<<<<<<< Updated upstream
from . import schemas, auth
from .models import User
=======
import models, schemas, auth
from .models import User, Diagnostic
>>>>>>> Stashed changes

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = User(nom=user.nom, prenom=user.prenom, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

<<<<<<< Updated upstream
uvicorn main:app --reload
=======
# Fonction pour récupérer tous les diagnostics pour la galerie
def get_all_diagnostics(db: Session):
    return db.query(Diagnostic).all()
>>>>>>> Stashed changes
