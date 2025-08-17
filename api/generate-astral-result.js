import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { answers, quizLength } = req.body;

    // --- DEBUT DES LOGS DE DEBUG ---
    // Ces logs vont nous montrer ce qui se passe réellement dans la fonction
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'exists' : 'does not exist');
    console.log('Received answers:', answers);
    console.log('Received quizLength:', quizLength);
    // --- FIN DES LOGS DE DEBUG ---

    const apiKey = process.env.GEMINI_API_KEY;

    // --- Construction des prompts pour les APIs de Google ---
    const textPrompt = `
      Créez une "Révélation Céleste" personnalisée pour une personne.
      Informations de la personne :
      - Prénom : ${answers.name || 'Non spécifié'}
      - Date de naissance : ${answers.birthDate || 'Non spécifiée'}
      - Lieu de naissance : ${answers.birthPlace || 'Non spécifié'}
      ${answers.birthTime ? `- Heure de naissance : ${answers.birthTime}\n` : ''}
      ${answers.personalityTrait ? `- Trait de personnalité : ${answers.personalityTrait}\n` : ''}
      ${answers.biggestDream ? `- Plus grand rêve : ${answers.biggestDream}\n` : ''}
      ${answers.lifeLesson ? `- Plus grande leçon de vie : ${answers.lifeLesson}\n` : ''}
      
      Utilisez ces informations pour offrir une interprétation profonde et personnelle.
      Le texte doit être inspiré par l'astrologie et la spiritualité.
      Adoptez un ton inspirant et poétique, dans le style "Soul Studio Art".
      Le texte doit être une révélation unique, d'environ 250 mots, et très personnalisé.
    `;

    const imagePrompt = `
      Générez une œuvre d'art numérique abstraite et mystique de haute qualité, inspirée par une "Révélation Céleste".
      L'image doit incorporer des éléments visuels liés au cosmos, à l'astrologie, et à l'énergie spirituelle.
      Les couleurs doivent être vibrantes et profondes. Le style doit être élégant et moderne, comme de l'art de studio pour l'âme.
      L'image doit représenter visuellement la révélation personnalisée de ${answers.name}, en tenant compte de ses aspirations et de sa personnalité.
    `;

    // --- Appel de l'API Gemini pour le texte ---
    const payloadText = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
    const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const responseText = await fetch(apiUrlText, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadText)
    });
    const resultText = await responseText.json();
    const generatedText = resultText?.candidates?.[0]?.content?.parts?.[0]?.text || "Impossible de générer le texte.";

    // --- Appel de l'API Imagen pour l'image ---
    const payloadImage = { instances: { prompt: imagePrompt }, parameters: { "sampleCount": 1 } };
    const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const responseImage = await fetch(apiUrlImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadImage)
    });
    const resultImage = await responseImage.json();
    const base64Data = resultImage?.predictions?.[0]?.bytesBase64Encoded;
    const imageUrl = base64Data ? `data:image/png;base64,${base64Data}` : null;

    res.status(200).json({ text: generatedText, imageUrl });

  } catch (error) {
    console.error('Erreur de la Vercel Function :', error);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
  }
}
