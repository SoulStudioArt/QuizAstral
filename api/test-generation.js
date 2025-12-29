import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    const mode = req.query.mode || 'astral_pur';
    
    // --- Configuration ---
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let testTitle = '';
    
    // On simule une initiale pour le test (ex: "M" pour Martin)
    const initial = "M"; 

    switch (mode) {
        // RETOUR AU STYLE "SOUL STUDIO" (Astral & Géométrique)
        case 'astral_pur':
            testTitle = `✨ Lab : Style Astral Pur + Constellation '${initial}'`;
            architectPrompt = `
              Tu es Directeur Artistique.
              Crée un prompt JSON pour une image d'Art Spirituel (Ratio 1:1).
              
              CONTEXTE : Le client s'appelle Martin (Initiale ${initial}).
              
              STYLE VISUEL (PRIORITÉ ABSOLUE) : 
              - Abstract Spiritual Art, Sacred Geometry, Astral, Cosmic.
              - High contrast, bioluminescent details, sharp lines, deep space background.
              - NE PAS FAIRE "ORGANIQUE" OU "FLOU". On veut du précis, du lumineux, du céleste.
              
              MISSION INITIALE CACHÉE :
              - Intègre l'initiale "${initial}" sous forme de CONSTELLATION ou de GÉOMÉTRIE SACRÉE.
              - La lettre doit être faite d'étoiles reliées par de fines lignes lumineuses (comme une carte du ciel).
              - Elle doit être élégante et fine, intégrée au reste du mandala ou de la nébuleuse.
              
              SÉCURITÉ : NO REALISTIC FACES. NO HUMANS. NO TEXT (Except the subtle initial). 8k resolution.
              
              Format JSON attendu : { "promptPourImage": "...", "description": "..." }
            `;
            break;
    }

    architectPrompt += ` Réponds UNIQUEMENT avec un objet JSON valide sans Markdown.`;

    // 1. GEMINI
    console.log(`🤖 Architecte au travail... Mode: ${mode}`);
    const payloadArchitect = { contents: [{ role: "user", parts: [{ text: architectPrompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    const resultArchitect = await responseArchitect.json();
    
    let plan;
    try {
        plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error("Erreur parsing JSON architecte", e);
        plan = { promptPourImage: "Abstract sacred geometry, cosmic energy, astral style, 8k", description: "Erreur JSON" };
    }
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
            // On interdit le style "organique/flou" pour retrouver le tranchant astral
            negativePrompt: "organic, muddy, blurry, soft, pastel, ugly, deformed face, bad anatomy, text, watermark, realistic human face, creepy"
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