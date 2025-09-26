import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'M�thode non autoris�e.' });
  }

  // Ces variables doivent �tre configur�es dans les "Environment Variables" de votre projet Vercel
  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;

  if (!printifyApiKey || !printifyStoreId) {
    return res.status(500).json({ error: 'Configuration Printify incompl�te sur le serveur.' });
  }

  try {
    // �tape 1 : R�cup�rer tous les mod�les de produits ("blueprints") de votre boutique
    const blueprintsResponse = await fetch(https://api.printify.com/v1/shops//blueprints.json, {
      headers: { 'Authorization': Bearer  }
    });
    if (!blueprintsResponse.ok) throw new Error('Impossible de r�cup�rer les blueprints Printify.');
    const blueprintsData = await blueprintsResponse.json();
    
    // --- C'est ici que vous choisirez les produits � vendre ---
    const relevantBlueprints = blueprintsData.filter(bp => 
      bp.title.toLowerCase().includes('Mystical') || bp.title.toLowerCase().includes('poster')
    );
    
    // �tape 2 : Pour chaque produit pertinent, r�cup�rer ses variantes (tailles, prix, etc.)
    const productsWithVariants = await Promise.all(
      relevantBlueprints.map(async (blueprint) => {
        const variantsResponse = await fetch(https://api.printify.com/v1/shops//blueprints//print_providers//variants.json, {
          headers: { 'Authorization': Bearer  }
        });
        if (!variantsResponse.ok) return null;
        const variantsData = await variantsResponse.json();
        
        // On formate les donn�es pour les rendre propres et simples pour la page produit
        return {
          title: blueprint.title,
          blueprint_id: blueprint.id,
          print_provider_id: blueprint.print_provider_id,
          variants: variantsData.variants.map(v => ({
            id: v.id,
            title: v.title,
            price: v.price / 100 // Le prix de Printify est en centimes, on le convertit
          }))
        };
      })
    );

    // On renvoie la liste finale des produits et leurs variantes
    res.status(200).json(productsWithVariants.filter(p => p !== null));

  } catch (error) {
    console.error('Erreur dans /api/get-printify-products:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la r�cup�ration des produits Printify.' });
  }
}
