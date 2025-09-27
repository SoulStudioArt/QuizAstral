const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const printifyApiKey = process.env.PRINTIFY_API_KEY;

  if (!printifyApiKey) {
    return res.status(500).json({ error: 'La variable PRINTIFY_API_KEY est manquante sur Vercel.' });
  }

  try {
    const response = await fetch('https://api.printify.com/v1/shops.json', {
      headers: {
        'Authorization': `Bearer ${printifyApiKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erreur de l'API Printify: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const stores = await response.json();
    // On renvoie la liste des boutiques trouvées
    res.status(200).json(stores);

  } catch (error) {
    console.error('Erreur dans /api/find-my-id:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des boutiques.' });
  }
};