import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  const printifyProductId = "68afb9338965a97df2049e3e";

  if (!printifyApiKey || !printifyStoreId) {
    return res.status(500).json({ error: 'Configuration Printify incomplète.' });
  }

  try {
    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${printifyProductId}.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productResponse.ok) {
      const errorBody = await productResponse.text();
      throw new Error(`Erreur API Printify: ${productResponse.status} ${errorBody}`);
    }

    const productData = await productResponse.json();

    // ==========================================================
    // === CORRECTION : On simplifie le premier filtre ici      ===
    // ==========================================================
    const enabledVariants = productData.variants.filter(v => v.is_enabled);

    const mappedVariants = enabledVariants.map(v => ({
      id: v.id,
      title: v.title,
      price: v.price / 100,
      sku: v.sku,
      // On utilise l'optional chaining pour trouver l'ID Shopify en toute sécurité
      shopify_variant_id: v.external?.id ?? null
    }))
    // On garde un deuxième filtre robuste pour s'assurer d'avoir les bonnes données
    .filter(v => v.shopify_variant_id && v.sku);

    const formattedProduct = {
      title: productData.title,
      blueprint_id: productData.blueprint_id,
      print_provider_id: productData.print_provider_id,
      variants: mappedVariants // Cette liste ne sera plus vide
    };
    
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}