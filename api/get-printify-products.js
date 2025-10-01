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
      throw new Error(`Erreur Printify API (products): ${productsResponse.status} ${productsResponse.statusText} - ${errorBody}`);
    }

    const productsData = await productsResponse.json();

    const formattedProducts = productsData.data.map(product => {
      // NOUVELLE LOGIQUE : On ne garde que les variantes qui sont "enabled" (activées)
      const enabledVariants = product.variants.filter(v => v.is_enabled);

      return {
        title: product.title,
        blueprint_id: enabledVariants.length > 0 ? enabledVariants[0].blueprint_id : null, 
        print_provider_id: enabledVariants.length > 0 ? enabledVariants[0].print_provider_id : null,
        variants: enabledVariants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price / 100,
        }))
      };
    }).filter(p => p.variants.length > 0); // On s'assure de ne pas garder de produits sans variantes actives

    res.status(200).json(formattedProducts);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits Printify.', details: error.message });
  }
}