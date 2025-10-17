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

    // FINAL DEBUG: Let's see what is inside v.external for each variant
    const mappedVariants = productData.variants
      .filter(v => v.is_enabled)
      .map(v => ({
        title: v.title,
        sku: v.sku,
        is_enabled: v.is_enabled,
        external_data: v.external // We will just output the entire external object
      }));

    const formattedProduct = {
      title: productData.title,
      variants_debug: mappedVariants // Sending this under a "variants_debug" key
    };
    
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}