const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], diagnostics: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(dbPath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], diagnostics: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getNextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map(item => item.id || 0)) + 1;
}

module.exports = {
  readDb,
  writeDb,
  getNextId
};
