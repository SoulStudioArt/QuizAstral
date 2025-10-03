import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  
  // L'ID spécifique de votre produit personnalisé sur Printify
  const printifyProductId = "68afb9338965a97df2049e3e";

  if (!printifyApiKey || !printifyStoreId) {
    return res.status(500).json({ error: 'Configuration Printify incomplète sur le serveur.' });
  }

  try {
    // On appelle l'endpoint pour UN SEUL produit pour avoir toutes les infos
    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${printifyProductId}.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productResponse.ok) {
      const errorBody = await productResponse.text();
      throw new Error(`Erreur Printify API (single product): ${productResponse.status} ${errorBody}`);
    }

    const productData = await productResponse.json();
    
    // On filtre pour ne garder que les variantes qui sont activées ("is_enabled": true)
    const enabledVariants = productData.variants.filter(v => v.is_enabled);

    // On transforme les données et on s'assure d'avoir un ID Shopify
    const mappedVariants = enabledVariants.map(v => {
      // LA LIGNE CLÉ : On accède à l'ID Shopify via v.external.id de façon sécurisée
      const shopifyVariantId = v.external?.id ?? null;

      return {
        id: v.id, // ID de la variante Printify
        title: v.title,
        price: v.price / 100,
        shopify_variant_id: shopifyVariantId // L'ID Shopify numérique
      };
    })
    // On fait un dernier filtre pour ne garder que les variantes où l'ID Shopify a bien été trouvé
    .filter(v => v.shopify_variant_id); 

    const formattedProduct = {
      title: productData.title,
      variants: mappedVariants
    };
    
    // On renvoie un tableau contenant notre unique produit, comme attendu par le script de la boutique
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du produit Printify.', details: error.message });
  }
}