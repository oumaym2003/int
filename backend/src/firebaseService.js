const { auth, firestore, storage } = require('./firebase');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const useLocalStorage = String(process.env.USE_LOCAL_STORAGE || '').toLowerCase() === 'true';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizePart(value) {
  return String(value || 'NA')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// Créer un utilisateur avec Firebase Authentication
async function createUser(nom, prenom, email, password) {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${prenom} ${nom}`
    });

    // Stocker les infos supplémentaires dans Realtime DB
    await firestore.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      nom,
      prenom,
      email,
      createdAt: new Date().toISOString()
    });

    return userRecord;
  } catch (error) {
    throw new Error(`Erreur création utilisateur: ${error.message}`);
  }
}

// Vérifier les identifiants et créer un token
async function loginUser(email, password) {
  try {
    // Utiliser une fonction client-side pour Firebase (à implémenter côté frontend)
    // Ici on retourne juste l'utilisateur
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error) {
    throw new Error('Utilisateur non trouvé');
  }
}

// Créer un diagnostic
async function createDiagnostic(utilisateurId, nomMaladie, typeMaladie, imageFile, nomMedecin) {
  try {
    const diagnosticId = crypto.randomUUID();

    const safeNomMaladie = sanitizePart(nomMaladie);
    const safeTypeMaladie = sanitizePart(typeMaladie);
    const safeMedecinId = sanitizePart(utilisateurId);

    const counterKey = `${safeNomMaladie}_${safeTypeMaladie}_${safeMedecinId}`;
    const counterRef = firestore.collection('counters').doc(counterKey);
    const compteur = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists ? Number(snap.data().value || 0) : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next }, { merge: true });
      return next;
    });

    const ext = path.extname(imageFile.originalname || '').toLowerCase() || '.jpg';
    const fileBaseName = `${safeNomMaladie}_${safeTypeMaladie}_${safeMedecinId}_${compteur}`;
    const renamedFileName = `${fileBaseName}${ext}`;

    let url = '';
    let imagePath = `diagnostics/${renamedFileName}`;

    if (useLocalStorage) {
      // Sauvegarde locale (pas besoin de facturation Firebase Storage)
      const uploadsRoot = path.join(__dirname, '..', 'uploads');
      const targetDir = path.join(uploadsRoot, 'diagnostics');
      ensureDir(targetDir);
      const targetPath = path.join(targetDir, renamedFileName);
      fs.writeFileSync(targetPath, imageFile.buffer);
      url = `/uploads/diagnostics/${encodeURIComponent(renamedFileName)}`;
    } else {
      // Uploader l'image vers Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(imagePath);

      await file.save(imageFile.buffer, {
        metadata: {
          contentType: imageFile.mimetype
        }
      });

      // Obtenir l'URL de téléchargement public
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
      });
      url = signedUrl;
    }

    // Calculer le hash de l'image
    const imageHash = crypto.createHash('sha256').update(imageFile.buffer).digest('hex');

    // Sauvegarder les métadonnées dans Realtime DB
    await firestore.collection('diagnostics').doc(diagnosticId).set({
      id: diagnosticId,
      utilisateurId,
      nomMaladie,
      typeMaladie,
      pathImageOriginale: imageFile.originalname,
      pathImageRenommee: imagePath,
      compteurClasse: compteur,
      nomFichierRenomme: renamedFileName,
      nomMedecinDiagnostiqueur: nomMedecin,
      imageHash,
      imageUrl: url,
      createdAt: new Date().toISOString()
    });

    return {
      id: diagnosticId,
      imageUrl: url,
      nomMaladie,
      typeMaladie
    };
  } catch (error) {
    throw new Error(`Erreur création diagnostic: ${error.message}`);
  }
}

// Récupérer tous les diagnostics d'un utilisateur
async function getUserDiagnostics(utilisateurId) {
  try {
    const snapshot = await firestore.collection('diagnostics')
      .where('utilisateurId', '==', utilisateurId)
      .get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    throw new Error(`Erreur récupération diagnostics: ${error.message}`);
  }
}

// Supprimer un diagnostic
async function deleteDiagnostic(diagnosticId) {
  try {
    await firestore.collection('diagnostics').doc(diagnosticId).delete();
    return true;
  } catch (error) {
    throw new Error(`Erreur suppression diagnostic: ${error.message}`);
  }
}

// Renommer un diagnostic
async function updateDiagnostic(diagnosticId, nomMaladie) {
  try {
    await firestore.collection('diagnostics').doc(diagnosticId).update({
      nomMaladie
    });
    return true;
  } catch (error) {
    throw new Error(`Erreur mise à jour diagnostic: ${error.message}`);
  }
}

module.exports = {
  createUser,
  loginUser,
  createDiagnostic,
  getUserDiagnostics,
  deleteDiagnostic,
  updateDiagnostic
};
