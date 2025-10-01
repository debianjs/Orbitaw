// Contenido actualizado para: server.js

const express = require('express');
const path = require('path');
const handleAIRequest = require('./api/ai.js'); // <-- Importamos la lógica

const app = express();
app.use(express.json());

// Sirve los archivos estáticos de tu proyecto (index.html, realtime-chat.js, etc.)
app.use(express.static(path.join(__dirname)));

// Usamos la función importada para manejar la ruta /api/ai
app.post('/api/ai', handleAIRequest);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://127.0.0.1:${PORT}`);
});
