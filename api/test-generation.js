import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    // On récupère le "mode" depuis l'adresse web (ex: ?mode=initiale)
    const mode = req.query.mode || 'astral_doux';
    
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let testTitle = '';

    // --- LES 3 SCÉNARIOS DE TEST ---
    switch (mode) {
        
        // 🟢 TEST 1 : LE STYLE "ASTRAL DOUX" (Celui qu'on a validé)
        case 'astral_doux':
            testTitle = "✨ Test 1 : Astral Doux & Mat";
            architectPrompt = `
              Tu es Directeur Artistique. Crée un prompt pour une image Carrée (1:1).
              CONTEXTE : Une âme née à Paris qui rêve de Liberté.
              STYLE : "Soft Spiritual Art", "Organic Textures", "Ethereal Watercolor", "Matte Finish".
              COULEURS : Pastel, Earth tones, Gold dust. NO NEON.
              SÉCURITÉ : No humans, no faces.
              JSON : { "promptPourImage": "...", "description": "..." }
            `;
            break;

        // 🟡 TEST 2 : L'INITIALE CACHÉE (Pour voir si c'est subtil)
        case 'initiale':
            testTitle = "🤫 Test 2 : Initiale Cachée (Lettre 'A')";
            architectPrompt = `
              Tu es Directeur Artistique. Crée un prompt pour une image Carrée (1:1).
              CONTEXTE : Prénom "Alice".
              MISSION : Intégrer la lettre "A" de façon ULTRA SUBTILE et camouflée dans des constellations ou des nuages.
              STYLE : Astral, mystique, doux.
              SÉCURITÉ : No humans, no faces.
              JSON : { "promptPourImage": "...", "description": "..." }
            `;
            break;

        // 🔴 TEST 3 : L'ANCIEN STYLE (Pour comparer)
        case 'ancien_neon':
            testTitle = "⚡ Test 3 : Ancien Style (Néon/Vibrant)";
            architectPrompt = `
              Tu es Directeur Artistique.
              STYLE : Cosmic Nebula, Bioluminescent, High Contrast, Neon colors.
              SÉCURITÉ : No humans.
              JSON : { "promptPourImage": "...", "description": "..." }
            `;
            break;
    }

    architectPrompt += ` Réponds UNIQUEMENT avec un objet JSON valide.`;

    // 1. GEMINI (L'Architecte)
    const payloadArchitect = { contents: [{ role: "user", parts: [{ text: architectPrompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    const resultArchitect = await responseArchitect.json();
    let plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    const { promptPourImage, description } = plan;

    // 2. IMAGEN (L'Artiste)
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
            // On utilise ton Negative Prompt sécurisé
            negativePrompt: "neon, electric colors, oversaturated, high contrast, shiny, plastic, sci-fi, typography, fonts, text, watermark, ugly, deformed face, realistic human face"
        } 
    };

    const responseImage = await fetch(apiUrlImage, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadImage) });
    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // 3. AFFICHAGE HTML (Pas de sauvegarde, juste visionnage)
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <body style="background:#111; color:#eee; font-family:sans-serif; text-align:center; padding:40px;">
          <h1 style="color:#d4af37;">${testTitle}</h1>
          <div style="margin:20px auto; max-width:600px;">
            <img src="data:image/png;base64,${base64Data}" style="width:100%; border-radius:10px; box-shadow:0 0 30px rgba(255,215,0,0.2);" />
            <p style="margin-top:20px; font-size:18px; color:#aaa;">"${description}"</p>
            <p style="font-size:12px; color:#555; margin-top:30px;">PROMPT UTILISÉ :<br>${promptPourImage}</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Erreur</h1><p>${error.message}</p>`);
  }
}