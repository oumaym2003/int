require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (_req, res) => {
  res.json({ message: "Bienvenue sur l'API médicale!" });
});

app.use('/api', routes);

module.exports = app;
