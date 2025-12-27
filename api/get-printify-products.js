import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const printifyApiKey = process.env.PRINTIFY_API_KEY;
  const printifyStoreId = process.env.PRINTIFY_STORE_ID;
  
  // ID de ton produit "Toile Carrée" dans Printify
  const printifyProductId = "68afb9338965a97df2049e3e"; 

  if (!printifyApiKey || !printifyStoreId) {
    console.error("❌ ERREUR CONFIG : API Key ou Store ID manquant.");
    return res.status(500).json({ error: 'Configuration Printify incomplète.' });
  }

  try {
    // 1. LOG DE DÉBUT
    console.log('================================================');
    console.log('📦 RÉCUPÉRATION DU CATALOGUE PRINTIFY');
    console.log('================================================');

    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products/${printifyProductId}.json`, {
      headers: { 'Authorization': `Bearer ${printifyApiKey}` },
    });

    if (!productResponse.ok) {
      const errorBody = await productResponse.text();
      console.error(`❌ ERREUR API PRINTIFY: ${productResponse.status}`, errorBody);
      throw new Error(`Erreur API Printify: ${productResponse.status}`);
    }

    const productData = await productResponse.json();
    console.log(`✅ Produit connecté : "${productData.title}"`);

    // 2. TRAITEMENT ET LOG DES PRIX
    const mappedVariants = productData.variants
      .filter(v => v.is_enabled) // On garde seulement les actives
      .sort((a, b) => parseInt(a.title) - parseInt(b.title)) // Tri par taille (6, 10, 12...)
      .map(v => ({
        id: v.id,
        title: v.title,
        price: v.price / 100, // Conversion cents -> dollars
        sku: v.sku
      }));

    // 3. AFFICHAGE DU TABLEAU DANS LES LOGS
    console.log('📋 GRILLE TARIFAIRE ACTIVE :');
    mappedVariants.forEach(variant => {
        // On aligne le texte pour que ce soit joli dans les logs
        console.log(`   🔹 Taille : ${variant.title.padEnd(10, ' ')} | Prix : ${variant.price.toFixed(2)} $`);
    });
    console.log('================================================');

    const formattedProduct = {
      title: productData.title,
      blueprint_id: productData.blueprint_id,
      print_provider_id: productData.print_provider_id,
      variants: mappedVariants
    };
    
    res.status(200).json([formattedProduct]);

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE GET-PRODUCTS:', error.message);
    res.status(500).json({ error: 'Erreur serveur.', details: error.message });
  }
}