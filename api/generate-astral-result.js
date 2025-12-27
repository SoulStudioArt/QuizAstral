import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { answers } = req.body;
    
    if (!answers) {
      console.error("❌ ERREUR : Aucune réponse reçue pour le texte.");
      return res.status(400).json({ error: 'Données de quiz manquantes.' });
    }

    // ============================================================
    // 🕵️‍♂️ LOGS DE DÉBOGAGE (Visible dans Vercel / Rev)
    // ============================================================
    console.log('================================================');
    console.log('📜 DÉMARRAGE GÉNÉRATION TEXTE (RÉVÉLATION)');
    console.log('================================================');
    console.log('📥 DONNÉES REÇUES DU CLIENT :');
    console.log(`- Prénom : ${answers.name}`);
    console.log(`- Date : ${answers.birthDate} à ${answers.birthTime}`);
    console.log(`- Lieu : ${answers.birthPlace}`);
    console.log(`- Aura : ${answers.personalityTrait}`);
    console.log(`- Rêve : ${answers.biggestDream}`);
    console.log(`- Leçon : ${answers.lifeLesson}`);
    console.log('================================================');

    const apiKey = process.env.GEMINI_API_KEY;

    // --- PROMPT "SOUL STUDIO" OPTIMISÉ (ORACLE) ---
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
      1. INTERDICTION FORMELLE de faire une liste à puces. Écris un récit fluide, poétique et mystique.
      2. LE SECRET : Tisse des liens invisibles. Explique comment leur lieu de naissance influence leur rêve, ou comment leur heure de naissance éclaire leur leçon de vie.
      3. Ton : Profond, empathique, céleste. Tu ne parles pas À la personne, tu parles À SON ÂME. Utilise le "Tu" ou le "Vous" de majesté spirituelle.
      4. Structure :
         - Une introduction cosmique liée à leurs origines.
         - Un cœur de révélation qui analyse la synergie de leurs réponses.
         - Une conclusion inspirante (un mantra personnel).
    `;

    const payloadText = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
    
    // Utilisation du modèle performant Gemini 2.5 Flash
    const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const responseText = await fetch(apiUrlText, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadText)
    });

    if (!responseText.ok) {
        const errorBody = await responseText.text();
        console.error("❌ Erreur API Gemini (Texte):", errorBody);
        return res.status(responseText.status).json({ error: `Erreur Gemini: ${responseText.statusText}` });
    }

    const resultText = await responseText.json();
    const generatedText = resultText?.candidates?.[0]?.content?.parts?.[0]?.text || "Les étoiles sont silencieuses pour le moment...";

    console.log('✍️ TEXTE GÉNÉRÉ PAR L\'ORACLE :');
    console.log(generatedText.substring(0, 200) + "..."); // On affiche le début pour ne pas encombrer si c'est long
    console.log('================================================');

    res.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE TEXTE :', error);
    res.status(500).json({ error: 'Erreur serveur génération texte.' });
  }
}