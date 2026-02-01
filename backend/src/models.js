const User = {
  id: String,
  nom: String,
  prenom: String,
  email: String,
  hashedPassword: String,
  createdAt: Number
};

const Diagnostic = {
  id: String,
  nomMaladie: String,
  typeMaladie: String,
  pathImageOriginale: String,
  pathImageRenommee: String,
  utilisateurId: String,
  nomMedecinDiagnostiqueur: String,
  imageHash: String,
  createdAt: Number
};

module.exports = { User, Diagnostic };