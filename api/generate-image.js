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
    // === MODIFICATIONS APPORTÉES ICI ===
    // ======================================================================

    const imagePrompt = `
      Générez une œuvre d'art numérique abstraite et mystique de haute qualité, inspirée par une "Révélation Céleste".
      L'œuvre doit remplir la totalité de l'image, sans aucune marge, bordure ou espace blanc. C'est une image "full bleed".
      L'image doit incorporer des éléments visuels liés au cosmos, à l'astrologie, aux nébuleuses, aux motifs géométriques sacrés et aux symboles astraux.
      Les couleurs doivent être vibrantes et profondes. Le style doit être élégant et moderne, comme de l'art de studio pour l'âme.
      La composition doit être harmonieuse avec les éléments principaux bien centrés.
      L'image doit représenter visuellement la révélation personnalisée de ${answers.name}, en tenant compte de ses aspirations et de sa personnalité.
    `;

    // On renforce le prompt négatif pour inclure les bordures et le texte
    const negativePromptText = "visage, portrait, figure humaine, écriture, texte, lettres, bordure, cadre, marge, espace blanc";

    // On ajoute le negativePrompt et le ratio d'aspect au payload
    const payloadImage = { 
      instances: { 
        prompt: imagePrompt,
        negativePrompt: negativePromptText
      }, 
      parameters: { 
        "sampleCount": 1,
        "aspectRatio": "1:1" // Garantit une image carrée de haute qualité
      } 
    };
    
    // ======================================================================
    // === FIN DES MODIFICATIONS ===
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