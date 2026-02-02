const admin = require('firebase-admin');
const path = require('path');

// Initialiser Firebase Admin en utilisant le service account JSON file
// GOOGLE_APPLICATION_CREDENTIALS doit pointer vers le fichier pfe-db.json
admin.initializeApp({
  databaseURL: process.env.FIREBASE_REALTIME_DB_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const auth = admin.auth();
const storage = admin.storage();
const firestore = admin.firestore();

module.exports = {
  admin,
  auth,
  storage,
  firestore
};
