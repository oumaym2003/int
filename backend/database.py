from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# REMPLACE les infos ci-dessous si elles sont différentes pour ton ami
# Format : postgresql://utilisateur:motdepasse@ip:port/nom_de_la_bdd
DATABASE_URL = "postgresql://postgres:1234@127.0.0.1:5433/pfe-db"

try:
    engine = create_engine(
        DATABASE_URL,
        # Ce paramètre règle le problème d'encodage (UnicodeDecodeError)
        connect_args={"options": "-c client_encoding=utf8"}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    print("✅ Configuration de la base de données prête.")
except Exception as e:
    print(f"❌ Erreur lors de la configuration de la DB : {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()