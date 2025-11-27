import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  try {
    // On choisit le type de test via l'URL (ex: ?type=animal). Par défaut : 'egypt'
    const type = req.query.type || 'egypt';
    
    // --- Infos Google Cloud ---
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; 
    const apiKey = process.env.GEMINI_API_KEY;

    let architectPrompt = '';
    let simulatedData = {};
    let productTitle = '';

    // === CONFIGURATION DES 4 SCÉNARIOS ===
    switch (type) {
        case 'animal':
            productTitle = "🦁 Totem Animal";
            simulatedData = {
                name: "Thomas", trait: "Protecteur", element: "Terre", reaction: "J'observe avant d'agir"
            };
            architectPrompt = `
              Tu es un chaman expert. Profil : ${JSON.stringify(simulatedData)}.
              Mission : Trouve l'Animal Totem (ex: Ours, Loup, Aigle).
              JSON : { "descriptionPourLeClient": "Texte inspirant...", "promptPourImage": "Prompt ANGLAIS style Double Exposure, animal majestic fused with nature, 8k." }
            `;
            break;

        case 'aura':
            productTitle = "✨ Aura Chromatique";
            simulatedData = {
                name: "Sarah", mood: "Sereine", energy: "Douce", wish: "Paix intérieure"
            };
            architectPrompt = `
              Tu es un artiste de l'énergie. Profil : ${JSON.stringify(simulatedData)}.
              Mission : Traduire son énergie en couleurs fluides.
              JSON : { "descriptionPourLeClient": "Poème sur ses couleurs...", "promptPourImage": "Prompt ANGLAIS abstract fluid art, liquid gradients, ethereal glow, no objects, 8k." }
            `;
            break;

        case 'tarot':
            productTitle = "🔮 Tarot de l'Âme";
            simulatedData = {
                name: "Julien", question: "Mon prochain défi ?", vibe: "Introspectif"
            };
            architectPrompt = `
              Tu es un tarologue. Profil : ${JSON.stringify(simulatedData)}.
              Mission : Tirer une Carte Majeure pour lui.
              JSON : { "descriptionPourLeClient": "Interprétation de la carte...", "promptPourImage": "Prompt ANGLAIS style Art Nouveau (Mucha), mystical tarot card, golden borders, 8k." }
            `;
            break;
case 'psyche':
            productTitle = "🍄 Voyage Intérieur (Psychédélique)";
            simulatedData = {
                name: "Alex",
                dream: "Rêve lucide et contrôle",
                geometry: "Spirale Infinie (Fibonacci)",
                colors: "Néon électrique sur fond noir"
            };
            architectPrompt = `
              Tu es un artiste visionnaire (style Alex Grey ou Android Jones).
              Profil : ${JSON.stringify(simulatedData)}.
              Mission : Créer une représentation visuelle de sa conscience expandue.
              JSON attendu :
              1. "descriptionPourLeClient" : Texte mystique sur l'ouverture du troisième œil et la géométrie de son esprit.
              2. "promptPourImage" : Prompt ANGLAIS pour art psychédélique haute définition.
                 - Mots-clés : Infinite fractals, bioluminescence, kaleidoscope, sacred geometry, DMT style, neon colors against deep black, hyper-detailed.
                 - AUCUN VISAGE RÉALISTE, focus sur la structure mentale.
            `;
            break;
        case 'egypt':
        default:
            productTitle = "☥ Héritage Égyptien";
            simulatedData = {
                name: "Clara", personality: "Leader naturelle", values: "Vérité"
            };
            architectPrompt = `
              Tu es un prêtre égyptien. Profil : ${JSON.stringify(simulatedData)}.
              Mission : Associer une divinité égyptienne.
              JSON : { "descriptionPourLeClient": "Lien avec la divinité...", "promptPourImage": "Prompt ANGLAIS style Ancient Egyptian Art, Gold leaf, Lapis Lazuli, Papyrus texture, 8k." }
            `;
            break;
    }

    architectPrompt += ` Réponds UNIQUEMENT avec un objet JSON valide.`;

    // === ÉTAPE 1 : GEMINI (TEXTE) ===
    const payloadArchitect = { contents: [{ role: "user", parts: [{ text: architectPrompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    const resultArchitect = await responseArchitect.json();
    let plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    const { descriptionPourLeClient, promptPourImage } = plan;

    // === ÉTAPE 2 : VERTEX AI (IMAGE) ===
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
    if (!responseImage.ok) throw new Error(`Erreur Vertex AI: ${responseImage.statusText}`);
    
    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // === ÉTAPE 3 : AFFICHAGE ===
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <head><title>Test: ${productTitle}</title></head>
        <body style="background:#111; color:#eee; font-family:sans-serif; text-align:center; padding:40px;">
          <h1 style="color:#f0a500">${productTitle}</h1>
          <div style="display:flex; gap:40px; justify-content:center; align-items:start; flex-wrap:wrap;">
            <img src="data:image/png;base64,${base64Data}" style="max-width:500px; border-radius:10px; box-shadow:0 0 30px rgba(255,255,255,0.1);" />
            <div style="max-width:400px; text-align:left; background:#222; padding:25px; border-radius:12px;">
                <h3>Révélation :</h3>
                <p style="font-size:1.1em; line-height:1.6;">${descriptionPourLeClient}</p>
                <hr style="border-color:#444; margin:20px 0;">
                <small style="color:#666">Prompt : ${promptPourImage}</small>
            </div>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Erreur</h1><p>${error.message}</p>`);
  }
}