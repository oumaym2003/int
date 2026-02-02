const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || "votre_cle_secrete_a_changer";
const ALGORITHM = "HS256";

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

async function getPasswordHash(password) {
  return await bcrypt.hash(password, 10);
}

function createAccessToken(data) {
  return jwt.sign(data, SECRET_KEY, { algorithm: ALGORITHM, expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

module.exports = {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  verifyToken
};