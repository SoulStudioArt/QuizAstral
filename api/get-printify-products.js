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
    // === MODIFICATION CLÉ : On appelle l'endpoint pour UN SEUL produit ===
    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${printifyProductId}.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productResponse.ok) {
      const errorBody = await productResponse.text();
      throw new Error(`Erreur Printify API (single product): ${productResponse.status} ${errorBody}`);
    }

    const productData = await productResponse.json();
    
    // Le reste du code est similaire, mais adapté pour un seul produit
    
    // 1. On filtre les variantes pour ne garder que celles qui sont actives ET synchronisées avec Shopify
    const enabledVariants = productData.variants.filter(v => v.is_enabled && v.external);

    // 2. On transforme les données pour chaque variante
    const mappedVariants = enabledVariants.map(v => {
      // Cette logique va maintenant fonctionner car la donnée sera présente
      const shopifyVariantId = v.external?.variant_id?.split('/')?.pop() ?? null;

      return {
        id: v.id, // ID de la variante Printify
        title: v.title,
        price: v.price / 100,
        shopify_variant_id: shopifyVariantId // L'ID Shopify !
      };
    })
    // 3. On s'assure de ne garder que les variantes qui ont bien un ID Shopify
    .filter(v => v.shopify_variant_id); 

    const formattedProduct = {
      title: productData.title,
      variants: mappedVariants
    };
    
    // On renvoie un tableau contenant notre unique produit formaté,
    // pour que le script sur la page Shopify n'ait pas besoin de changer.
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du produit Printify.', details: error.message });
  }
}