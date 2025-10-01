// Contenido para: api/ai.js

const fetch = require('node-fetch');

// Mueve tus claves aquí
const CLOUDFLARE_API_KEY = 'xOFCtcPnTX-2LUo-UGZR-L1igs2ghRDNWRFZwxCt'; // ¡Mantenla secreta!
const CLOUDFLARE_ACCOUNT_ID = 'e1e2f5ba69edc38470bd9f87f331321b';

async function handleAIRequest(req, res) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de la API de Cloudflare: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Error en el proxy de la IA:', error);
    res.status(500).json({ error: 'Error al contactar la API de IA.' });
  }
}

// Exportamos la función para que server.js pueda usarla
module.exports = handleAIRequest;
