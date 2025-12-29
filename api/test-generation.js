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
    
    // On garde "M" pour tester Martin
    const initial = "M"; 

    switch (mode) {
        case 'astral_subtil':
            testTitle = `✨ Lab : Initiale '${initial}' (Version Paréidolie)`;
            architectPrompt = `
              Tu es Directeur Artistique.
              Crée un prompt JSON pour une image Carrée (1:1).
              
              CONTEXTE : Le client s'appelle Martin (Initiale ${initial}).
              STYLE : Abstract Spiritual Art, Sacred Geometry, Ethereal, Astral.
              
              MISSION CRITIQUE (L'INITIALE CACHÉE) :
              - Tu ne dois PAS demander "A letter ${initial}".
              - Tu dois demander "A constellation arrangement that vagueley resembles the shape of an ${initial}" OU "A rift in the nebula forming a negative space ${initial}".
              - Ça doit ressembler à un HASARD cosmique (Paréidolie).
              - Si ça ressemble à un logo ou une police d'écriture, c'est raté.
              - Mots clés à utiliser : "Faint", "Barely visible", "Star cluster", "Nebula formation".
              
              SÉCURITÉ : NO REALISTIC FACES. NO HUMANS. 8k resolution.
              
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
            // LISTE NOIRE RENFORCÉE (On interdit les lettres brillantes)
            negativePrompt: "typography, font, text, letter, watermark, writing, alphabet, glowing letter, neon sign, logo, bold lines, ugly, deformed face"
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
            <p style="font-size:11px; color:#555;">PROMPT : ${promptPourImage}</p>
          </div>
          <br><br><a href="/api/test-generation" style="color:#fff; border:1px solid #555; padding:10px;">🔄 Régénérer</a>
        </body>
      </html>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Erreur</h1><p>${error.message}</p>`);
  }
}