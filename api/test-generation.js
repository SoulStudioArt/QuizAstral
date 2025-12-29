import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    const mode = req.query.mode || 'astral_subtil';
    
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let testTitle = '';
    
    // Initiale de test
    const initial = "M"; 

    switch (mode) {
        case 'astral_subtil':
            testTitle = `✨ Lab : Initiale '${initial}' (Fusion Organique)`;
            architectPrompt = `
              Tu es Directeur Artistique.
              Crée un prompt JSON pour une image d'Art Spirituel (Carrée 1:1).
              
              CONTEXTE : Le client s'appelle Martin (Initiale ${initial}).
              STYLE : Ethereal Spiritual Art, Abstract Organic Textures, Dreamy Atmosphere.
              (Évite le look "Science-Fiction" ou "Espace Profond" trop sombre).
              
              MISSION CRITIQUE (L'INITIALE CACHÉE) :
              1. L'IMAGE D'ABORD : L'initiale ne doit PAS être le centre de l'attention. L'image doit être une œuvre d'art magnifique et équilibrée.
              2. DIVERSITÉ : Ne te limite pas aux étoiles ! La lettre peut être formée par :
                 - Une volute de fumée ou de nuage.
                 - Une faille dans une texture rocheuse.
                 - Un jeu d'ombre et de lumière (Chiaroscuro).
                 - Une veine d'or liquide (Kintsugi).
                 - L'espace vide (négatif) entre deux formes.
              3. SUBTILITÉ EXTRÊME : La lettre doit être petite, intégrée naturellement. C'est un secret, pas un titre.
              
              SÉCURITÉ : NO REALISTIC FACES. NO HUMANS. NO TYPOGRAPHY.
              
              Format JSON attendu : { "promptPourImage": "...", "description": "..." }
            `;
            break;
    }

    architectPrompt += ` Réponds UNIQUEMENT avec un objet JSON valide.`;

    // 1. GEMINI
    console.log(`🤖 Architecte au travail... Mode: ${mode}`);
    const payloadArchitect = { contents: [{ role: "user", parts: [{ text: architectPrompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    const resultArchitect = await responseArchitect.json();
    let plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    const { promptPourImage, description } = plan;

    console.log(`🎨 Prompt généré : ${promptPourImage}`);

    // 2. IMAGEN
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;

    const apiUrlImage = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;
    const payloadImage = { 
        instances: [ { prompt: promptPourImage } ], 
        parameters: { 
            sampleCount: 1, 
            aspectRatio: "1:1",
            // On interdit formellement les lettres "écrites" ou brillantes
            negativePrompt: "typography, font, text, giant letter, centered letter, neon sign, logo, bold lines, ugly, deformed, watermark"
        } 
    };

    const responseImage = await fetch(apiUrlImage, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadImage) });
    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // 3. AFFICHAGE
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <body style="background:#0a0a0a; color:#f0f0f0; font-family:sans-serif; text-align:center; padding:20px;">
          <h2 style="color:#d4af37;">${testTitle}</h2>
          <div style="background:#161616; padding:20px; border-radius:15px; display:inline-block; border:1px solid #333; max-width: 600px;">
            <img src="data:image/png;base64,${base64Data}" style="width:100%; height:auto; border-radius:8px;" />
            <p style="margin-top:20px; font-style:italic; color:#ccc;">"${description}"</p>
            <p style="font-size:11px; color:#555; text-align:left;">PROMPT : ${promptPourImage}</p>
          </div>
          <br><br><a href="/api/test-generation" style="color:#fff; border:1px solid #555; padding:10px;">🔄 Régénérer</a>
        </body>
      </html>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Erreur</h1><p>${error.message}</p>`);
  }
}