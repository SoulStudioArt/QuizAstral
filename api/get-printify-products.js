import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;

  if (!printifyApiKey || !printifyStoreId) {
    return res.status(500).json({ error: 'Configuration Printify incomplète sur le serveur.' });
  }

  try {
    const productsResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productsResponse.ok) {
      const errorBody = await productsResponse.text();
      throw new Error(`Erreur Printify API: ${productsResponse.status} ${errorBody}`);
    }

    const productsData = await productsResponse.json();

    // TEMPORAIREMENT : On renvoie les données brutes de Printify sans aucun filtre ni formatage
    res.status(200).json(productsData);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products (mode debug):', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits.', details: error.message });
  }
}