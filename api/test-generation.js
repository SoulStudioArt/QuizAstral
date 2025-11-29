import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    // Choisir le type via l'URL.
    const type = req.query.type || 'luxury_cosmic';
    
    // --- Infos Google Cloud ---
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let productTitle = '';

    // === CONFIGURATION DES NOUVEAUX SCÉNARIOS BASÉS SUR TES IMAGES ===
    switch (type) {
        // SCÉNARIO 1 : LE SALON "ELEGANCE COSMIQUE"
        // But : Montrer une toile 36x36 dans un salon très classe. Art abstrait bleu/or.
        case 'luxury_cosmic':
            productTitle = "🌌 Mockup - Salon Cosmique";
            architectPrompt = `
              Tu es un photographe d'architecture de luxe.
              Mission : Créer un JSON pour une image de mise en situation (Mockup).
              JSON :
              { 
                "descriptionPourLeClient": "Mise en situation réaliste : Toile abstraite dans un salon.", 
                "promptPourImage": "A photorealistic wide shot of a luxurious modern living room with a large 36x36 square canvas art hanging on a white wall. The art on the canvas is a deep cosmic abstract design: swirling midnight blue nebulas and gold dust, NO specific figures, just pure magical energy. Soft warm lighting, beige sofa, expensive decor. 8k resolution, architectural digest style." 
              }
            `;
            break;

        // SCÉNARIO 2 : LA GALERIE D'ART (Minimaliste)
        // But : Focus total sur la toile avec un éclairage de musée. Très "Premium".
        case 'luxury_gallery':
            productTitle = "🏛️ Mockup - Galerie d'Art";
            architectPrompt = `
              Tu es un directeur artistique.
              Mission : Créer un JSON pour une image style "Galerie".
              JSON :
              { 
                "descriptionPourLeClient": "Focus sur la qualité du produit (Toile Galerie).", 
                "promptPourImage": "A close-up side angle of a premium 36x36 square canvas print hanging in a high-end art gallery. A spotlight hits the canvas. The art is a mystical gradient of deep indigo and cyan light, representing a soul portal. The canvas texture and side wrap are visible. Minimalist background, sharp focus on the art. 8k." 
              }
            `;
            break;

        // SCÉNARIO 3 : L'INTÉRIEUR BOHÈME CHIC (Chaleureux)
        // But : Montrer que ça fit bien dans une maison normale mais stylée.
        case 'luxury_boho':
            productTitle = "🌿 Mockup - Bohème Spirituel";
            architectPrompt = `
              Tu es un décorateur d'intérieur.
              Mission : Créer un JSON pour une ambiance chaleureuse.
              JSON :
              { 
                "descriptionPourLeClient": "Ambiance spirituelle et douce.", 
                "promptPourImage": "Interior design shot of a cozy spiritual corner in a home. A large 36x36 square canvas hangs above a wooden console table with crystals and a plant. The canvas art features a glowing golden circle of energy on a dark background (Sacred Geometry style but abstract). Sunlight streaming in. Photorealistic, cozy atmosphere." 
              }
            `;
            break;

        // --- (On garde tes anciens tests au cas où) ---
        case 'psyche':
             productTitle = "🍄 Test Psychédélique";
             architectPrompt = `Tu es un artiste visionnaire. JSON: { "descriptionPourLeClient": "Test Psyche", "promptPourImage": "Abstract fractal art, vibrant neon colors, sacred geometry spirals, bioluminescent textures, no specific objects, 8k, visionary art style." }`;
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
    const payloadImage = { instances: [ { prompt: promptPourImage } ], parameters: { sampleCount: 1, aspectRatio: "1:1" } }; // Aspect ratio carré

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