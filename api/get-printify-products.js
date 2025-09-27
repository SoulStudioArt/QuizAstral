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
    // --- CHANGEMENT IMPORTANT ICI ---
    // On interroge les "products" (produits publiés) au lieu des "blueprints".
    const productsResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productsResponse.ok) {
      const errorBody = await productsResponse.text();
      throw new Error(`Erreur Printify API (products): ${productsResponse.status} ${productsResponse.statusText} - ${errorBody}`);
    }

    const productsData = await productsResponse.json();

    // On formate les données pour les rendre propres et simples pour la page produit
    const formattedProducts = productsData.data.map(product => {
      return {
        title: product.title,
        // Les IDs importants se trouvent dans les variantes pour les produits publiés
        blueprint_id: product.variants[0].blueprint_id, 
        print_provider_id: product.variants[0].print_provider_id,
        variants: product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price / 100,
        }))
      };
    });

    res.status(200).json(formattedProducts);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits Printify.', details: error.message });
  }
}