import fetch from 'node-fetch';

export default async function handler(req, res) {
  // ==========================================================
  // === LA CORRECTION EST ICI : On ajoute les en-têtes CORS ===
  // ==========================================================
  res.setHeader('Access-Control-Allow-Origin', 'https://soulstudioart.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Si la requête est une "preflight request" OPTIONS, on répond simplement OK.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // ==========================================================

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

    const mappedVariants = productData.variants
      .filter(v => v.is_enabled)
      .sort((a, b) => parseInt(a.title) - parseInt(b.title))
      .map(v => ({
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