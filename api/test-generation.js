import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    // Choisir le type via l'URL. Par défaut on force le boheme pour ton test
    const type = req.query.type || 'luxury_boho';
    
    // --- Infos Google Cloud ---
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let productTitle = '';

    switch (type) {
        // --- SCÉNARIO 3 : BOHÈME (Version Stabilisée) ---
        // Modification : On force la présence du Canvas au début du prompt
        case 'luxury_boho':
            productTitle = "🌿 Mockup - Bohème Spirituel (Stabilisé)";
            architectPrompt = `
              Tu es un photographe d'intérieur expert.
              Mission : Créer un JSON pour une mise en situation produit.
              JSON :
              { 
                "descriptionPourLeClient": "Ambiance spirituelle et douce avec focus sur la toile.", 
                "promptPourImage": "CENTERPIECE: A large square canvas art print hanging on a beige wall. The canvas is the main subject. The art on the canvas features a glowing golden Sacred Geometry mandala on a deep black background, radiating light. CONTEXT: Below the canvas is a wooden console table with amethyst crystals and a green pothos plant. Soft natural sunlight casts shadows of leaves on the wall. Photorealistic, 8k, interior design magazine style, cozy atmosphere." 
              }
            `;
            break;

        // --- AUTRES SCÉNARIOS (CONSERVÉS) ---
        case 'luxury_cosmic':
            productTitle = "🌌 Mockup - Salon Cosmique";
            architectPrompt = `Tu es un photographe. JSON: { "descriptionPourLeClient": "Mise en situation réaliste.", "promptPourImage": "A photorealistic wide shot of a luxurious modern living room with a large 36x36 square canvas art hanging on a white wall. The art is a deep cosmic abstract design: swirling midnight blue nebulas and gold dust. Soft warm lighting, beige sofa. 8k resolution." }`;
            break;

        case 'luxury_gallery':
            productTitle = "🏛️ Mockup - Galerie d'Art";
            architectPrompt = `Tu es un directeur artistique. JSON: { "descriptionPourLeClient": "Focus qualité.", "promptPourImage": "A close-up side angle of a premium 36x36 square canvas print hanging in a high-end art gallery. Spotlight on the canvas. The art is a mystical gradient of deep indigo and cyan light. Minimalist background. 8k." }`;
            break;

        default:
             productTitle = "❓ Test Standard";
             architectPrompt = `Tu es un assistant. JSON: { "descriptionPourLeClient": "Test défaut", "promptPourImage": "A mysterious blue energy sphere, abstract art, 8k." }`;
             break;
    }

    architectPrompt += ` Réponds UNIQUEMENT avec un objet JSON valide.`;

    // === ÉTAPE 1 : GEMINI ===
    const payloadArchitect = { contents: [{ role: "user", parts: [{ text: architectPrompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    const resultArchitect = await responseArchitect.json();
    let plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    const { descriptionPourLeClient, promptPourImage } = plan;

    // === ÉTAPE 2 : VERTEX AI ===
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    const apiUrlImage = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;
    const payloadImage = { instances: [ { prompt: promptPourImage } ], parameters: { sampleCount: 1, aspectRatio: "1:1" } };

    const responseImage = await fetch(apiUrlImage, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payloadImage) });
    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // === ÉTAPE 3 : AFFICHAGE ===
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <head><title>${productTitle}</title></head>
        <body style="background:#0a0a0a; color:#f0f0f0; font-family:sans-serif; text-align:center; padding:20px;">
          <h2 style="color:#d4af37; letter-spacing:2px;">${productTitle}</h2>
          <div style="background:#1a1a1a; padding:20px; border-radius:15px; display:inline-block; border:1px solid #333;">
            <img src="data:image/png;base64,${base64Data}" style="max-width:100%; height:auto; max-height:600px; border-radius:5px; box-shadow:0 0 50px rgba(0,0,0,0.5);" />
            <p style="margin-top:20px; font-style:italic; color:#888;">${descriptionPourLeClient}</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Erreur</h1><p>${error.message}</p>`);
  }
}