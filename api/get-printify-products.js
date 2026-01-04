import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;

  // CONFIGURATION DES DEUX PRODUITS
  // 1. Premium (L'ancien, on le garde en premier pour ne pas casser le site actuel)
  const premiumId = "68afb9338965a97df2049e3e"; 
  // 2. Standard (Le nouveau, pour l'option économique)
  const standardId = "695ad1f4aaa143cc00020c47"; 

  if (!printifyApiKey || !printifyStoreId) {
    console.error("❌ ERREUR CONFIG : API Key ou Store ID manquant.");
    return res.status(500).json({ error: 'Configuration Printify incomplète.' });
  }

  try {
    console.log('================================================');
    console.log('📦 RÉCUPÉRATION DU CATALOGUE COMPLET (STANDARD + PREMIUM)');
    console.log('================================================');

    // On lance les deux appels à Printify en PARALLÈLE (pour que ça aille vite)
    const [premiumRes, standardRes] = await Promise.all([
        fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${premiumId}.json`, { headers: { 'Authorization': `Bearer ${printifyApiKey}` } }),
        fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${standardId}.json`, { headers: { 'Authorization': `Bearer ${printifyApiKey}` } })
    ]);

    if (!premiumRes.ok || !standardRes.ok) {
        throw new Error(`Erreur API Printify lors de la récupération des produits.`);
    }

    const premiumData = await premiumRes.json();
    const standardData = await standardRes.json();

    console.log(`✅ Premium chargé : "${premiumData.title}"`);
    console.log(`✅ Standard chargé : "${standardData.title}"`);

    // Fonction pour nettoyer et formater les données
    const formatProduct = (data, type) => {
        const variants = data.variants
            .filter(v => v.is_enabled)
            .sort((a, b) => parseInt(a.title) - parseInt(b.title))
            .map(v => ({
                id: v.id,
                title: v.title, // Ex: "30" x 30" / 0.75""
                price: v.price / 100,
                sku: v.sku
            }));
        
        return {
            type: type, // "premium" ou "standard"
            title: data.title,
            blueprint_id: data.blueprint_id,
            print_provider_id: data.print_provider_id,
            variants: variants
        };
    };

    // On prépare la réponse
    const catalog = [
        formatProduct(premiumData, "premium"), // Index 0 (Le site actuel lit ça)
        formatProduct(standardData, "standard") // Index 1 (Le nouveau choix)
    ];

    console.log('📋 CATALOGUE ENVOYÉ AU SITE AVEC SUCCÈS.');
    console.log('================================================');
    
    // On renvoie la liste
    res.status(200).json(catalog);

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE GET-PRODUCTS:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}