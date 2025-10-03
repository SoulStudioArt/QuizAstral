import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  const printifyProductId = "68afb9338965a97df2049e3e"; // L'ID de votre produit

  if (!printifyApiKey || !printifyStoreId) {
    return res.status(500).json({ error: 'Configuration Printify incomplète sur le serveur.' });
  }

  try {
    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${printifyProductId}.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productResponse.ok) {
      const errorBody = await productResponse.text();
      throw new Error(`Erreur Printify API: ${productResponse.status} ${errorBody}`);
    }

    const productData = await productResponse.json();

    // TEMPORAIREMENT : On renvoie les données brutes de ce produit spécifique, sans aucun filtre.
    res.status(200).json(productData);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products (mode debug 2):', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du produit.', details: error.message });
  }
}