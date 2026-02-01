const { auth, db, storage } = require('./firebase');
const crypto = require('crypto');

// Créer un utilisateur avec Firebase Authentication
async function createUser(nom, prenom, email, password) {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${prenom} ${nom}`
    });

    // Stocker les infos supplémentaires dans Realtime DB
    await db.ref(`users/${userRecord.uid}`).set({
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
    
    // Uploader l'image vers Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(`diagnostics/${diagnosticId}/${imageFile.originalname}`);
    
    await file.save(imageFile.buffer, {
      metadata: {
        contentType: imageFile.mimetype
      }
    });

    // Obtenir l'URL de téléchargement public
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    // Calculer le hash de l'image
    const imageHash = crypto.createHash('sha256').update(imageFile.buffer).digest('hex');

    // Sauvegarder les métadonnées dans Realtime DB
    await db.ref(`diagnostics/${diagnosticId}`).set({
      id: diagnosticId,
      utilisateurId,
      nomMaladie,
      typeMaladie,
      pathImageOriginale: imageFile.originalname,
      pathImageRenommee: `${diagnosticId}/${imageFile.originalname}`,
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
    const snapshot = await db.ref('diagnostics').orderByChild('utilisateurId').equalTo(utilisateurId).once('value');
    const diagnostics = [];
    snapshot.forEach(child => {
      diagnostics.push(child.val());
    });
    return diagnostics;
  } catch (error) {
    throw new Error(`Erreur récupération diagnostics: ${error.message}`);
  }
}

// Supprimer un diagnostic
async function deleteDiagnostic(diagnosticId) {
  try {
    await db.ref(`diagnostics/${diagnosticId}`).remove();
    return true;
  } catch (error) {
    throw new Error(`Erreur suppression diagnostic: ${error.message}`);
  }
}

// Renommer un diagnostic
async function updateDiagnostic(diagnosticId, nomMaladie) {
  try {
    await db.ref(`diagnostics/${diagnosticId}`).update({
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
