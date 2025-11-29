import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    // Choisir le type via l'URL. Par défaut 'luxury_boho_v2' pour tester tes changements
    const type = req.query.type || 'luxury_boho_v2';
    
    // --- Infos Google Cloud ---
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let productTitle = '';

    switch (type) {
        // --- SCÉNARIO 1 : BOHÈME VIBRANT (Coin Lecture) ---
        // Changement : On met plus de couleurs (Violets/Oranges) et un décor "Fauteuil"
        case 'luxury_boho_v2':
            productTitle = "🔮 Mockup - Coin Lecture Mystique";
            architectPrompt = `
              Tu es un photographe d'intérieur.
              Mission : Créer un JSON pour une mise en situation "Lifestyle".
              JSON :
              { 
                "descriptionPourLeClient": "Mise en situation cosy avec une toile aux couleurs vibrantes.", 
                "promptPourImage": "CENTERPIECE: A large 36x36 square canvas art hanging on a textured beige wall. The art is EXPLOSIVE: a mix of deep violet, fiery orange, and bright gold dust forming a cosmic mandala. CONTEXT: The canvas is hanging above a comfortable velvet armchair with a knitted throw blanket. Warm 'Golden Hour' sunlight hits the wall, enhancing the colors of the art. A stack of books on a side table. Photorealistic, 8k, cozy luxury." 
              }
            `;
            break;

        // --- SCÉNARIO 2 : MINIMALISTE ÉLECTRIQUE (Focus Couleur) ---
        // Changement : Mur très blanc, Art très "Bleu/Cyan/Or" intense comme tes exemples
        case 'luxury_vibrant':
            productTitle = "⚡ Mockup - Énergie Pure";
            architectPrompt = `
              Tu es un directeur artistique.
              Mission : Créer un JSON où la toile est l'élément le plus coloré de la pièce.
              JSON :
              { 
                "descriptionPourLeClient": "Contraste fort entre le mur blanc et l'énergie de la toile.", 
                "promptPourImage": "CENTERPIECE: A premium square canvas art print on a pristine white wall. The art features a blindingly bright central star emitting waves of Electric Blue, Cyan, and Magenta energy against a deep black void. It looks like a high-tech spiritual portal. CONTEXT: Minimalist decor, a modern ceramic vase with dry branches on the side. Sharp, high-fashion lighting casting crisp shadows. 8k, ultra-detailed." 
              }
            `;
            break;

        // --- ANCIENS (Gardés pour référence) ---
        case 'luxury_boho':
            productTitle = "🌿 Mockup - Bohème (V1)";
            architectPrompt = `Tu es photographe. JSON: { "descriptionPourLeClient": "V1", "promptPourImage": "CENTERPIECE: A large square canvas art on a beige wall. Art is Golden Sacred Geometry on black. CONTEXT: Wooden console, crystals, plants. Soft light. 8k." }`;
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