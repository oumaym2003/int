# Diagnostic ORL - Guide de démarrage

## 📋 Prérequis

- Node.js v16+ installé
- npm installé
- Clé Firebase configurée dans `.env` (backend)

## 🚀 Démarrage rapide

### Terminal 1 : Backend Node.js + Firebase

```bash
cd c:\Users\21625\pfe\interface\backend
npm install
npm start
```

Le backend démarre sur **http://localhost:8000**

### Terminal 2 : Frontend React

```bash
cd c:\Users\21625\pfe\interface\frontend
npm install
npm start
```

Le frontend démarre sur **http://localhost:3000**

---

## 📁 Structure du projet

```
interface/
├── backend/
│   ├── src/
│   │   ├── server.js          # Point d'entrée
│   │   ├── app.js             # Configuration Express
│   │   ├── routes.js          # Routes API
│   │   ├── firebase.js        # Initialisation Firebase
│   │   ├── firebaseService.js # Logique métier Firebase
│   │   └── auth.js            # (deprecated - utiliser Firebase)
│   ├── uploads/               # Dossier des uploads (local)
│   ├── data/                  # Stockage JSON (local)
│   ├── .env                   # Variables Firebase
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Page de connexion
│   │   │   ├── Accueil.jsx    # Page diagnostic
│   │   │   └── MesImages.jsx  # Page mes images
│   │   ├── App.jsx            # Routing principal
│   │   └── setupProxy.js      # Proxy vers backend
│   ├── public/
│   │   └── index.html
│   └── package.json
│
└── api/
    └── index.js               # Export pour Vercel
```

---

## 🔗 API Endpoints

### Authentification

**POST** `/api/register`
```json
{
  "nom": "Doe",
  "prenom": "John",
  "email": "john@example.com",
  "password": "password123"
}
```

**POST** `/api/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
Retourne: `{ access_token, token_type, uid }`

### Diagnostics

**POST** `/api/diagnostic/` *(requires token)*
```
FormData:
  - file: (image file)
  - nom_maladie: "OMA"
  - type_maladie: "cong"
  - nom_medecin_diagnostiqueur: "Dr. Smith"

Header: Authorization: Bearer {token}
```

**GET** `/api/mes-images` *(requires token)*
```
Header: Authorization: Bearer {token}
```

**POST** `/api/supprimer-image` *(requires token)*
```json
{ "imageId": "123" }
Header: Authorization: Bearer {token}
```

**POST** `/api/renommer-image` *(requires token)*
```json
{
  "imageId": "123",
  "newDiseaseName": "OSM"
}
Header: Authorization: Bearer {token}
```

---

## 🔧 Configuration Firebase

### Variables d'environnement (`.env`)

Le fichier `.env` est déjà configuré avec les variables Firebase.

```
FIREBASE_PROJECT_ID=pfe-db-736e3
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_REALTIME_DB_URL=https://pfe-db-736e3-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_STORAGE_BUCKET=pfe-db-736e3.appspot.com
```

---

## 📝 Tâches pour ta binôme

### À compléter :

1. **Firebase Realtime Database**
   - Fichier: `backend/src/firebaseService.js`
   - Implémenter la persistance complète des users et diagnostics
   - Ajouter les règles de sécurité Firebase

2. **Firebase Storage**
   - Fichier: `backend/src/firebaseService.js`
   - Vérifier les permissions de upload
   - Tester les URLs de téléchargement

3. **Frontend Authentication (optionnel)**
   - Fichier: `frontend/src/App.jsx`
   - Implémenter Firebase Auth côté frontend
   - Optionnel : ajouter Google Sign-In

4. **Gestion d'erreurs**
   - Afficher les erreurs Firebase correctement
   - Logger les problèmes de connexion

5. **Deployment Vercel**
   - Fichier: `vercel.json` (déjà configuré)
   - Push sur GitHub
   - Connecter à Vercel
   - Configurer les variables d'environnement sur Vercel

---

## 🧪 Test rapide

### Créer un utilisateur

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Doe",
    "prenom": "John",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Se connecter

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

---

## 🚀 Déploiement sur Vercel

1. Push sur GitHub
2. Connecter le repo à Vercel
3. Ajouter les variables d'environnement
4. Deploy !

---

## ❓ Troubleshooting

### Port 8000 déjà utilisé
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Erreur Firebase
- Vérifier `.env`
- Vérifier les droits Firebase
- Vérifier le projet ID

### Erreur CORS
- Proxy configuré dans `setupProxy.js`
- Backend utilise `cors`
