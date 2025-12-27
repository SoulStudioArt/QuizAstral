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
      return res.status(400).json({ error: 'Données manquantes.' });
    }

    console.log('--- DONNÉES REÇUES DU QUIZ ---');

    // --- ÉTAPE 1 : L'ARCHITECTE (Gemini 2.5) ---
    const apiKey = process.env.GEMINI_API_KEY; 

    // On inclut TOUTES les réponses pour que l'image soit VRAIMENT unique
    const architectPrompt = `
      Tu es un Visionnaire Artistique IA pour "Soul Studio".
      Analyse ces données sacrées d'un client :
      1. Prénom: ${answers.name}
      2. Date/Heure: ${answers.birthDate} à ${answers.birthTime}
      3. Lieu: ${answers.birthPlace}
      4. Aura: ${answers.personalityTrait}
      5. Rêve: ${answers.biggestDream}
      6. Leçon de vie: ${answers.lifeLesson}

      TA MISSION :
      Crée un objet JSON avec deux champs :
      
      1. "descriptionPourLeClient": Une phrase mystique de 20 mots max qui explique pourquoi cette image représente leur âme (utilise le "Tu").
      
      2. "promptPourImage": Un prompt TRÈS DÉTAILLÉ en ANGLAIS pour un générateur d'image (Imagen).
      
      RÈGLES STRICTES POUR LE PROMPT IMAGE :
      - Style : Abstract Spiritual Art, Sacred Geometry, Ethereal, Bioluminescent, Cosmic Nebula.
      - ÉLÉMENTS : Incorpore visuellement des éléments subtils liés à son "Lieu" (ex: montagnes, océan, ville) et son "Rêve".
      - SÉCURITÉ : NO REALISTIC FACES. NO HUMANS. Focus on silhouettes, energy flows, constellations, hands, or eyes of the universe.
      - Qualité : 8k resolution, cinematic lighting, masterpiece, intricate details.
      
      Format de réponse attendu : { "descriptionPourLeClient": "...", "promptPourImage": "..." }
    `;

    const payloadArchitect = {
      contents: [{ role: "user", parts: [{ text: architectPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };
    
    // ON GARDE TA VERSION : gemini-2.5-flash
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    
    if (!responseArchitect.ok) {
        const errTxt = await responseArchitect.text();
        console.error("Erreur Gemini Architecte:", errTxt);
        throw new Error(`Erreur Architecte: ${responseArchitect.statusText}`);
    }
    
    const resultArchitect = await responseArchitect.json();
    let plan;
    try {
        plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    } catch (e) {
        // Fallback si le JSON est mal formé
        plan = { 
            descriptionPourLeClient: "Une vision pure de votre énergie intérieure.", 
            promptPourImage: "Abstract sacred geometry, cosmic energy, blue and gold, 8k, no faces, ethereal masterpiece" 
        };
    }
    const { descriptionPourLeClient, promptPourImage } = plan;

    console.log('--- PROMPT GÉNÉRÉ ---', promptPourImage);

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
    
    // On garde ton modèle Imagen (le 3.0 est très bien)
    const modelId = 'imagen-3.0-generate-001';

    const apiUrlImage = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

    const payloadImage = {
      instances: [ { prompt: promptPourImage } ],
      parameters: { 
          sampleCount: 1, 
          aspectRatio: "1:1",
          // SÉCURITÉ CRITIQUE : On force l'IA à éviter les visages moches
          negativePrompt: "ugly, deformed face, bad anatomy, text, watermark, blurry, low quality, distorted eyes, realistic human face, creepy"
      }
    };

    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payloadImage)
    });

    if (!responseImage.ok) {
        const errorBody = await responseImage.text();
        console.error("Erreur Vertex AI:", errorBody);
        throw new Error(`Erreur Vertex AI: ${responseImage.status} ${responseImage.statusText}`);
    }

    const resultImage = await responseImage.json();
    const base64Data = resultImage.predictions[0].bytesBase64Encoded;

    // --- ÉTAPE 3 : Sauvegarde ---
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `revelation-celeste-${Date.now()}.png`;

    const { url: imageUrl } = await put(filename, imageBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.status(200).json({ imageUrl, imageDescription: descriptionPourLeClient });

  } catch (error) {
    console.error('Erreur Générale Image:', error);
    res.status(500).json({ error: error.message });
  }
}