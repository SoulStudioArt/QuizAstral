import fetch from 'node-fetch';
import { put } from '@vercel/blob';
import { GoogleAuth } from 'google-auth-library'; // L'outil pour le passeport

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { answers } = req.body;
    
    if (!answers) {
      return res.status(400).json({ error: 'Données de quiz manquantes.' });
    }

    console.log('--- DONNÉES REÇUES DU QUIZ ---');

    // Configuration Vertex AI
    const projectId = 'soulstudio-art';
    const location = 'us-central1';
    const modelId = 'imagen-3.0-generate-001'; // Modèle stable pour Vertex AI

    // --- ÉTAPE 1 : L'IA "ARCHITECTE" (Gemini - Texte) ---
    // On garde la clé API simple pour le texte car ça marche très bien
    const apiKey = process.env.GEMINI_API_KEY; 

    const architectPrompt = `
      Tu es un directeur artistique et un poète symboliste. En te basant STRICTEMENT sur les informations suivantes :
      - Prénom: ${answers.name || 'Anonyme'}
      - Date de naissance: ${answers.birthDate || 'Inconnue'}
      - Trait de personnalité: ${answers.personalityTrait || 'Mystérieux'}
      - Plus grand rêve: ${answers.biggestDream || 'Explorer l\'inconnu'}
      
      Ta mission est de produire deux choses distinctes sous forme d'objet JSON :
      1.  descriptionPourLeClient: Une description poétique et HAUTEMENT PERSONNALISÉE de 2-3 phrases. Elle doit s'adresser directement à la personne.
      2.  promptPourImage: Un prompt technique et visuel, en anglais, pour générer cette image, en te concentrant sur des motifs de géométrie astrale complexe.
      Réponds UNIQUEMENT avec un objet JSON valide au format : { "descriptionPourLeClient": "...", "promptPourImage": "..." }
    `;

    const payloadArchitect = {
      contents: [{ role: "user", parts: [{ text: architectPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    };
    
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadArchitect) });
    
    if (!responseArchitect.ok) {
        const errTxt = await responseArchitect.text();
        console.error("Erreur Gemini:", errTxt);
        throw new Error(`Erreur Gemini Architecte: ${responseArchitect.statusText}`);
    }
    
    const resultArchitect = await responseArchitect.json();
    let plan;
    try {
        plan = JSON.parse(resultArchitect.candidates[0].content.parts[0].text);
    } catch (e) {
        // Fallback de sécurité
        plan = { descriptionPourLeClient: "Une œuvre céleste unique.", promptPourImage: "Cosmic nebula abstract art, high quality" };
    }
    const { descriptionPourLeClient, promptPourImage } = plan;

    console.log('--- PROMPT GÉNÉRÉ ---', promptPourImage);

    // --- ÉTAPE 2 : L'IA "ARTISTE" (Vertex AI / Imagen - Image) ---
    // Utilisation du PASSEPORT DIPLOMATIQUE (Compte de Service)

    // A. On s'authentifie avec les variables Vercel
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // B. On récupère un jeton d'accès temporaire
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    // C. On appelle la porte "Pro" (Vertex AI)
    const apiUrlImage = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

    const payloadImage = {
      instances: [ { prompt: promptPourImage } ],
      parameters: { sampleCount: 1, aspectRatio: "1:1" }
    };

    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // On montre le jeton sécurisé
      },
      body: JSON.stringify(payloadImage)
    });

    if (!responseImage.ok) {
        const errorBody = await responseImage.text();
        console.error("Erreur Vertex AI:", errorBody);
        throw new Error(`Erreur Vertex AI: ${responseImage.status} ${responseImage.statusText}`);
    }

    const resultImage = await responseImage.json();
    
    // Récupération de l'image
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
    console.error('Erreur Générale:', error);
    res.status(500).json({ error: error.message });
  }
}