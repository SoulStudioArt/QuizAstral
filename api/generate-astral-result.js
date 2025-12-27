import fetch from 'node-fetch';

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

    // --- PROMPT "SOUL STUDIO" OPTIMISÉ ---
    // On force l'IA à créer des liens logiques et émotionnels
    const textPrompt = `
      Agis comme un oracle ancestral et bienveillant pour "Soul Studio Art".
      Tu dois rédiger une "Révélation Céleste" (environ 250 mots) pour une âme unique.
      
      VOICI L'ESSENCE DE CETTE ÂME :
      - Prénom : ${answers.name || 'L\'Âme Voyageuse'}
      - Né(e) le : ${answers.birthDate || 'Date inconnue'}
      - À : ${answers.birthPlace || 'Lieu inconnu'}
      - Heure précise : ${answers.birthTime || 'Heure inconnue'}
      - Son Aura (Trait) : ${answers.personalityTrait || 'Non défini'}
      - Son Rêve Ultime : ${answers.biggestDream || 'Non défini'}
      - Sa Leçon de Vie : ${answers.lifeLesson || 'Non définie'}

      CONSIGNES DE RÉDACTION :
      1. Interdiction de faire une liste à puces. Écris un récit fluide, poétique et mystique.
      2. LE SECRET : Tisse des liens invisibles. Par exemple, explique comment leur lieu de naissance (ex: près de l'eau) nourrit leur rêve, ou comment leur heure de naissance influence leur trait de personnalité.
      3. Ton : Profond, empathique, céleste. Tu ne parles pas À la personne, tu parles À SON ÂME.
      4. Structure : Une introduction cosmique, un cœur de révélation qui analyse les liens subtils de ses réponses, et une conclusion inspirante (un mantra).
    `;

    const payloadText = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
    
    // ON GARDE TA VERSION PUISSANTE : gemini-2.5-flash
    const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseText = await fetch(apiUrlText, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadText)
    });

    if (!responseText.ok) {
        const errorBody = await responseText.text();
        console.error("Erreur API Gemini (Texte):", errorBody);
        return res.status(responseText.status).json({ error: `Erreur Gemini: ${responseText.statusText}` });
    }

    const resultText = await responseText.json();
    const generatedText = resultText?.candidates?.[0]?.content?.parts?.[0]?.text || "Les étoiles sont silencieuses pour le moment...";

    res.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('Erreur Vercel (texte) :', error);
    res.status(500).json({ error: 'Erreur serveur génération texte.' });
  }
}