import fetch from 'node-fetch';

export default async function (req, res) {
  try {
    const name = req.query.name || 'Clara';
    const birthDate = req.query.birthDate || '15 mai 1990';
    const personalityTrait = req.query.personalityTrait || 'Créative';
    const biggestDream = req.query.biggestDream || 'Voyager';

    const apiKey = process.env.GEMINI_API_KEY;

    // === ÉTAPE 1 : L'IA "ARCHITECTE" CRÉE LE PLAN ===
    const architectPrompt = `
      Tu es un directeur artistique et un poète symboliste. En te basant sur les informations suivantes :
      - Prénom: ${name}
      - Date de naissance: ${birthDate}
      - Trait de personnalité: ${personalityTrait}
      - Plus grand rêve: ${biggestDream}
      Ta mission est de produire deux choses distinctes sous forme d'objet JSON :
      1.  descriptionPourLeClient: Une description poétique de 2-3 phrases qui explique les symboles visuels d'une œuvre d'art imaginaire.
      2.  promptPourImage: Un prompt technique et visuel, en anglais, pour générer cette image, en te concentrant sur des motifs de géométrie astrale complexe, des nébuleuses et des symboles.
      Réponds UNIQUEMENT avec un objet JSON valide au format : { "descriptionPourLeClient": "...", "promptPourImage": "..." }
    `;
    const payloadArchitect = {
      contents: [{ role: "user", parts: [{ text: architectPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };
    // ======================================================================
    // === LA CORRECTION EST ICI : On utilise le nom de modèle qui fonctionne ===
    // ======================================================================
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    if (!responseArchitect.ok) {
      const errorBody = await responseArchitect.text();
      console.error("Erreur détaillée de l'API Gemini (Test):", errorBody);
      throw new Error(`Erreur Gemini: ${responseArchitect.statusText}`);
    }
    const resultArchitect = await responseArchitect.json();
    const plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    const { descriptionPourLeClient, promptPourImage } = plan;

    // === ÉTAPE 2 : L'IA "ARTISTE" EXÉCUTE LE PLAN ===
    const finalImagePrompt = `${promptPourImage}. Œuvre plein cadre, sans bordure (full bleed). Rendu élégant et sophistiqué.`;
    const negativePromptText = "visage, portrait, figure humaine, personne, silhouette, corps, yeux, photo-réaliste, bordure, cadre, marge";
    const payloadImage = {
      instances: { prompt: finalImagePrompt, negativePrompt: negativePromptText },
      parameters: { "sampleCount": 1, "aspectRatio": "1:1" }
    };
    const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const responseImage = await fetch(apiUrlImage, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadImage) });
    if (!responseImage.ok) throw new Error(`Erreur Imagen: ${responseImage.statusText}`);
    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // === ÉTAPE 3 : On affiche le résultat dans une simple page HTML ===
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <head>
          <title>Test de Génération</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; display: flex; gap: 2rem; align-items: flex-start; background-color: #f0f2f5; color: #333; }
            img { max-width: 512px; height: auto; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            div { max-width: 512px; }
            h2 { color: #5A31F4; border-bottom: 2px solid #5A31F4; padding-bottom: 0.5rem; }
            p { background: #fff; padding: 1rem; border-radius: 8px; line-height: 1.6; }
            code { background: #e0e0e0; padding: 1rem; border-radius: 8px; display: block; white-space: pre-wrap; font-family: monospace; }
          </style>
        </head>
        <body>
          <div>
            <h2>Image Générée :</h2>
            <img src="data:image/png;base64,${base64Data}" alt="Image générée" />
          </div>
          <div>
            <h2>Description pour le Client :</h2>
            <p>${descriptionPourLeClient}</p>
            <h2>Prompt Technique utilisé pour l'Image :</h2>
            <code>${promptPourImage}</code>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Erreur dans /api/test-generation:', error);
    res.status(500).send(`<html><body><h1>Erreur</h1><p>${error.message}</p></body></html>`);
  }
}