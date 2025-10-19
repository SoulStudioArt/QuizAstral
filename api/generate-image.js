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

    // ======================================================================
    // === LE NOUVEAU PROMPT "JUSTE MILIEU" ===
    // ======================================================================

    const imagePrompt = `
      Générez une œuvre d'art numérique de haute qualité, inspirée par une "Révélation Céleste" pour ${answers.name}.
      Le style est un mélange d'art mystique et cosmique.
      L'œuvre doit être riche en détails, incorporant des motifs de géométrie sacrée, des symboles astraux complexes, des nébuleuses colorées et des flux d'énergie lumineux.
      L'œuvre doit remplir la totalité de l'image, sans aucune marge ou bordure (full bleed).
      Les couleurs doivent être vibrantes et profondes, le rendu doit être élégant et sophistiqué.
    `;

    // Un prompt négatif ciblé uniquement sur ce qu'on ne veut pas.
    const negativePromptText = "visage, portrait, figure humaine, personne, silhouette, yeux, nez, bouche, photo-réaliste, enfantin, dessin simple";

    const payloadImage = { 
      instances: { 
        prompt: imagePrompt,
        negativePrompt: negativePromptText
      }, 
      parameters: { 
        "sampleCount": 1,
        "aspectRatio": "1:1"
      } 
    };
    
    // ======================================================================

    const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadImage)
    });

    if (!responseImage.ok) {
        return res.status(responseImage.status).json({ error: `Erreur de l'API Imagen: ${responseImage.statusText}` });
    }

    const resultImage = await responseImage.json();
    const base64Data = resultImage?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Data) {
      return res.status(500).json({ error: 'L\'API n\'a pas retourné de données d\'image valides.' });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `revelation-celeste-${Date.now()}.png`;

    const { url: imageUrl } = await put(filename, imageBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.status(200).json({ imageUrl });

  } catch (error) {
    console.error('Erreur de la Vercel Function (image) :', error);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur lors de la génération de l\'image.' });
  }
}