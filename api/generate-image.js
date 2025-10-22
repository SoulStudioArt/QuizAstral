import fetch from 'node-fetch';
import { put } from '@vercel/blob';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { answers } = req.body;
    
    if (!answers) {
      return res.status(400).json({ error: 'Données de quiz manquantes.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // --- PHASE 1 : L'IA "ARCHITECTE" CRÉE LE PLAN ---
    const architectPrompt = `
      Tu es un directeur artistique et un poète symboliste. En te basant sur les informations suivantes :
      - Prénom: ${answers.name || 'Anonyme'}
      - Date de naissance: ${answers.birthDate || 'Inconnue'}
      - Trait de personnalité: ${answers.personalityTrait || 'Mystérieux'}
      - Plus grand rêve: ${answers.biggestDream || 'Explorer l\'inconnu'}

      Ta mission est de produire deux choses distinctes sous forme d'objet JSON :
      1.  **descriptionPourLeClient**: Une description poétique de 2-3 phrases qui explique les symboles visuels d'une œuvre d'art imaginaire. Fais le lien entre ces symboles (constellations, couleurs, motifs) et les réponses du client. Ce texte doit être inspirant.
      2.  **promptPourImage**: Un prompt technique et visuel, en anglais pour une performance maximale, qui servira à générer cette image. Ce prompt doit décrire en détail les éléments à dessiner : le sujet principal (géométrie astrale complexe), les éléments visuels (nébuleuses, symboles astraux), le style (abstrait, mystique) et les couleurs (vibrantes, profondes). Il peut suggérer d'intégrer subtilement le prénom ou la date de naissance.

      Réponds UNIQUEMENT avec un objet JSON valide au format : { "descriptionPourLeClient": "...", "promptPourImage": "..." }
    `;

    const payloadArchitect = {
      contents: [{ role: "user", parts: [{ text: architectPrompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
      }
    };
    
    // ======================================================================
    // === LA CORRECTION EST ICI : On utilise le bon nom de modèle Gemini ===
    // ======================================================================
    const apiUrlArchitect = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const responseArchitect = await fetch(apiUrlArchitect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadArchitect)
    });

    if (!responseArchitect.ok) {
      const errorBody = await responseArchitect.text();
      console.error("Erreur détaillée de l'API Gemini:", errorBody);
      throw new Error(`Erreur de l'API Gemini (Architecte): ${responseArchitect.statusText}`);
    }

    const resultArchitect = await responseArchitect.json();
    const plan = JSON.parse(resultArchitect?.candidates?.[0]?.content?.parts?.[0]?.text);

    const { descriptionPourLeClient, promptPourImage } = plan;

    // --- PHASE 2 : L'IA "ARTISTE" EXÉCUTE LE PLAN ---
    const finalImagePrompt = `${promptPourImage}. L'œuvre doit remplir la totalité de l'image, sans aucune marge ou bordure (full bleed). Le rendu doit être élégant, sophistiqué et de haute qualité.`;
    const negativePromptText = "visage, portrait, figure humaine, personne, silhouette, corps, yeux, nez, bouche, main, cheveux, photo-réaliste, bordure, cadre, marge";

    const payloadImage = { 
      instances: { prompt: finalImagePrompt, negativePrompt: negativePromptText }, 
      parameters: { "sampleCount": 1, "aspectRatio": "1:1" } 
    };

    const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadImage)
    });

    if (!responseImage.ok) {
        throw new Error(`Erreur de l'API Imagen (Artiste): ${responseImage.statusText}`);
    }

    const resultImage = await responseImage.json();
    const base64Data = resultImage?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Data) {
      throw new Error('L\'API n\'a pas retourné de données d\'image valides.');
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `revelation-celeste-${Date.now()}.png`;

    const { url: imageUrl } = await put(filename, imageBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    
    res.status(200).json({ imageUrl, imageDescription: descriptionPourLeClient });

  } catch (error) {
    console.error('Erreur de la Vercel Function (image) :', error);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
  }
}