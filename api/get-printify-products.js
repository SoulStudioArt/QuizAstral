import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  
  // Assurez-vous que cet ID correspond au produit que vous utilisez dans Shopify
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

    const mappedVariants = productData.variants
      .filter(v => v.is_enabled) // 1. On garde seulement les variantes activées
      // ==========================================================
      // === LA CORRECTION EST ICI : On ajoute le tri numérique   ===
      // ==========================================================
      .sort((a, b) => parseInt(a.title) - parseInt(b.title))
      .map(v => ({ // 2. On transforme les données
        id: v.id,
        title: v.title,
        price: v.price / 100,
        sku: v.sku
      }));

    const formattedProduct = {
      title: productData.title,
      blueprint_id: productData.blueprint_id,
      print_provider_id: productData.print_provider_id,
      variants: mappedVariants
    };
    
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}