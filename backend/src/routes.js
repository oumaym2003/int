const express = require('express');
const multer = require('multer');
const { auth } = require('./firebase');
const { createUser, loginUser, createDiagnostic, getUserDiagnostics, deleteDiagnostic, updateDiagnostic } = require('./firebaseService');

const router = express.Router();

// Multer configuration - store in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware pour vérifier le token Firebase
async function verifyFirebaseToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ detail: 'Token manquant' });
  }
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Token invalide' });
  }
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password } = req.body || {};
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ detail: 'Champs requis manquants' });
    }

    const userRecord = await createUser(nom, prenom, email, password);
    return res.json({
      id: userRecord.uid,
      nom,
      prenom,
      email
    });
  } catch (error) {
    return res.status(400).json({ detail: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email et mot de passe requis' });
    }

    const userRecord = await loginUser(email, password);
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    return res.json({
      access_token: customToken,
      token_type: 'bearer',
      uid: userRecord.uid
    });
  } catch (error) {
    return res.status(400).json({ detail: error.message });
  }
});

// CREATE DIAGNOSTIC
router.post('/diagnostic/', upload.single('file'), verifyFirebaseToken, async (req, res) => {
  try {
    const { nom_maladie, type_maladie, nom_medecin_diagnostiqueur } = req.body || {};
    const { pathologie_id, option_stade } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ detail: 'Fichier requis' });
    }

    const diseaseName = nom_maladie || `Pathologie ${pathologie_id || 'N/A'}`;
    const stage = type_maladie || option_stade || '';

    const diagnostic = await createDiagnostic(
      req.user.uid,
      diseaseName,
      stage,
      req.file,
      nom_medecin_diagnostiqueur || 'Utilisateur'
    );

    return res.json({
      status: 'success',
      diagnostic_id: diagnostic.id,
      nom_fichier: req.file.originalname,
      imageUrl: diagnostic.imageUrl
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

// GET MES IMAGES
router.get('/mes-images', verifyFirebaseToken, async (req, res) => {
  try {
    const diagnostics = await getUserDiagnostics(req.user.uid);
    const images = diagnostics.map(item => ({
      id: item.id,
      url: item.imageUrl,
      diseaseName: item.nomMaladie,
      ownerName: item.nomMedecinDiagnostiqueur || 'Utilisateur'
    }));
    return res.json(images);
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

// GET IMAGE
router.get('/image/:id', async (req, res) => {
  try {
    const { db } = require('./firebase');
    const snapshot = await db.ref(`diagnostics/${req.params.id}`).once('value');
    const diagnostic = snapshot.val();
    
    if (!diagnostic) {
      return res.status(404).json({ detail: 'Image introuvable' });
    }

    return res.redirect(diagnostic.imageUrl);
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

// DELETE IMAGE
router.post('/supprimer-image', verifyFirebaseToken, async (req, res) => {
  try {
    const { imageId } = req.body || {};
    if (!imageId) {
      return res.status(400).json({ detail: 'ID image requis' });
    }

    await deleteDiagnostic(imageId);
    return res.json({ status: 'deleted' });
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

// RENAME IMAGE
router.post('/renommer-image', verifyFirebaseToken, async (req, res) => {
  try {
    const { imageId, newDiseaseName } = req.body || {};
    if (!imageId || !newDiseaseName) {
      return res.status(400).json({ detail: 'Requête invalide' });
    }

    await updateDiagnostic(imageId, newDiseaseName);
    return res.json({ status: 'updated' });
  } catch (error) {
    return res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
