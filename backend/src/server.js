const app = require('./app');

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Backend Node.js démarré sur le port ${PORT}`);
});
