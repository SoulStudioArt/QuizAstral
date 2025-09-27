export default async function handler(req, res) {
  if (req.method !== 'GET') { return res.status(405).json({ message: 'Méthode non autorisée.' }); }
  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  if (!printifyApiKey || !printifyStoreId) { return res.status(500).json({ error: 'Configuration Printify incomplète.' }); }
  try {
    const blueprintsResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/blueprints.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` }
    });
    if (!blueprintsResponse.ok) { throw new Error(`Erreur Printify (blueprints): ${blueprintsResponse.statusText}`); }
    const blueprintsData = await blueprintsResponse.json();
    const relevantBlueprints = blueprintsData.filter(bp => bp.title.toLowerCase().includes('canvas')); // PERSONNALISEZ CECI
    const productsWithVariants = await Promise.all(
      relevantBlueprints.map(async (blueprint) => {
        const variantsResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/blueprints/${blueprint.id}/print_providers/${blueprint.print_provider_id}/variants.json`, {
          headers: { 'Authorization': `Bearer ${printifyApiKey}` }
        });
        if (!variantsResponse.ok) return null;
        const variantsData = await variantsResponse.json();
        return {
          title: blueprint.title, blueprint_id: blueprint.id, print_provider_id: blueprint.print_provider_id,
          variants: variantsData.variants.map(v => ({ id: v.id, title: v.title, price: v.price / 100 }))
        };
      })
    );
    res.status(200).json(productsWithVariants.filter(p => p !== null));
  } catch (error) {
    console.error('Erreur dans get-printify-products:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}