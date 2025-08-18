import fetch from 'node-fetch';

export default async function (req, res) {
  // Vérifie que la requête est bien de type POST.
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { answers } = req.body;
    
    if (!answers) {
      return res.status(400).json({ error: 'Données de quiz manquantes.' });
    }

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

    const payloadText = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
    const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const responseText = await fetch(apiUrlText, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadText)
    });

    if (!responseText.ok) {
        return res.status(responseText.status).json({ error: `Erreur de l'API Gemini: ${responseText.statusText}` });
    }

    const resultText = await responseText.json();
    const generatedText = resultText?.candidates?.[0]?.content?.parts?.[0]?.text || "Impossible de générer le texte.";

    res.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('Erreur de la Vercel Function (texte) :', error);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur lors de la génération du texte.' });
  }
}
