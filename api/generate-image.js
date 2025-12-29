import fetch from 'node-fetch';
import { put } from '@vercel/blob';
import { GoogleAuth } from 'google-auth-library';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  try {
    const { answers } = req.body;
    
    if (!answers) {
      console.error("ERREUR : Aucune réponse reçue dans le body.");
      return res.status(400).json({ error: 'Données manquantes.' });
    }

    const firstName = answers.name || "Ame";
    const initial = firstName.charAt(0).toUpperCase();

    // LOGS
    console.log('================================================');
    console.log('🚀 DÉMARRAGE GÉNÉRATION (STYLE ASTRAL + INITIALE CACHÉE)');
    console.log(`- Prénom : ${answers.name} (Lettre cachée : ${initial})`);
    console.log('================================================');

    // --- ÉTAPE 1 : L'ARCHITECTE (Gemini 2.5) ---
    const apiKey = process.env.GEMINI_API_KEY; 

    const architectPrompt = `
      Tu es le Directeur Artistique de "Soul Studio".
      Analyse les réponses sacrées de ce client :
      1. Prénom: ${answers.name} (Initiale à cacher : ${initial})
      2. Lieu de naissance: ${answers.birthPlace}
      3. Rêve: ${answers.biggestDream}
      4. Trait de personnalité: ${answers.personalityTrait}
      5. Leçon de vie: ${answers.lifeLesson}

      TA MISSION :
      Crée un objet JSON avec deux champs.
      
      1. "promptPourImage": (Anglais) Un prompt TRÈS DÉTAILLÉ pour Imagen.
         - Style : Abstract Spiritual Art, Sacred Geometry, Ethereal, astral.
         - INSTRUCTION CLÉ : Intègre des métaphores visuelles du LIEU et du RÊVE.
         - SIGNATURE SECRÈTE (ULTRA-SUBTILE) : La lettre "${initial}" doit être PRESQUE INVISIBLE. Elle ne doit PAS être un élément distinct ou un logo. Elle doit être suggérée uniquement par l'alignement naturel de quelques étoiles ou une légère courbe de nébuleuse au centre. Elle doit être parfaitement camouflée dans l'abstraction. C'est un secret pour l'âme.
         - SÉCURITÉ : NO REALISTIC FACES. NO HUMANS. Focus on energy, silhouettes, constellations. 8k resolution.
      
      2. "descriptionPourLeClient": (Français) LE "DÉCODAGE DE L'ÂME".
         - Ce texte accompagnera l'image pour expliquer au client POURQUOI cette œuvre est unique.
         - Longueur : 40-50 mots.
         - IMPORTANT : Révèle au client qu'en regardant attentivement, les étoiles ou l'énergie forment secrètement l'initiale "${initial}" de son prénom.
         - EXEMPLE DE TON : "Les volutes astrales capturent votre rêve d'exploration, tandis que la géométrie centrale dissimule secrètement le 'M' de votre essence, visible seulement pour ceux qui savent regarder."
      
      Format attendu : { "descriptionPourLeClient": "...", "promptPourImage": "..." }
    `;

    const payloadArchitect = {
      contents: [{ role: "user", parts: [{ text: architectPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };
    
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    
    if (!responseArchitect.ok) {
        const errTxt = await responseArchitect.text();
        console.error("❌ Erreur Gemini Architecte:", errTxt);
        throw new Error(`Erreur Architecte: ${responseArchitect.statusText}`);
    }
    
    const resultArchitect = await responseArchitect.json();
    let plan;
    try {
        plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    } catch (e) {
        console.warn("⚠️ Fallback JSON");
        plan = { 
            descriptionPourLeClient: `Une œuvre céleste unique dissimulant le secret de votre initiale ${initial}.`, 
            promptPourImage: `Abstract sacred geometry, cosmic energy, astral style, extremely subtle hidden letter ${initial} in stars, 8k, no faces` 
        };
    }
    const { descriptionPourLeClient, promptPourImage } = plan;

    console.log('📝 DESCRIPTION :', descriptionPourLeClient);
    console.log('🎨 PROMPT :', promptPourImage);

    // --- ÉTAPE 2 : L'ARTISTE (Vertex AI / Imagen) ---
    
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

    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001';

    const apiUrlImage = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

    const payloadImage = {
      instances: [ { prompt: promptPourImage } ],
      parameters: { 
          sampleCount: 1, 
          aspectRatio: "1:1",
          negativePrompt: "ugly, deformed face, bad anatomy, text, watermark, blurry, low quality, distorted eyes, realistic human face, creepy"
      }
    };

    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payloadImage)
    });

    if (!responseImage.ok) {
        const errorBody = await responseImage.text();
        console.error("❌ Erreur Vertex AI:", errorBody);
        throw new Error(`Erreur Vertex AI: ${responseImage.status} ${responseImage.statusText}`);
    }

    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // --- ÉTAPE 3 : SAUVEGARDE ---
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `revelation-${Date.now()}.png`;

    const { url: imageUrl } = await put(filename, imageBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log('✅ Image sauvegardée :', imageUrl);
    res.status(200).json({ imageUrl, imageDescription: descriptionPourLeClient });

  } catch (error) {
    console.error('❌ ERREUR:', error);
    res.status(500).json({ error: error.message });
  }
}