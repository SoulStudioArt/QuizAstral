import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // 1. VÉRIFICATION DE LA MÉTHODE HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // 2. VÉRIFICATION DE LA SIGNATURE SHOPIFY (SÉCURITÉ)
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !shopifyWebhookSecret) {
    console.error('Webhook secret ou header HMAC manquant.');
    return res.status(401).json({ message: 'Erreur d\'authentification: Clé secrète ou header manquant.' });
  }

  const rawBody = await getRawBody(req);
  
  const hmac = crypto.createHmac('sha256', shopifyWebhookSecret)
    .update(rawBody)
    .digest('base64');

  if (hmac !== hmacHeader) {
    console.error('Hachage du webhook non valide. Requête rejetée.');
    return res.status(401).json({ message: 'Hachage du webhook non valide.' });
  }
  
  try {
    const order = JSON.parse(rawBody.toString('utf8'));
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;
    
    if (!printifyApiKey || !printifyStoreId) {
      console.error('Clé API ou ID de boutique Printify manquants dans les variables d\'environnement Vercel.');
      return res.status(500).json({ error: 'Configuration Printify incomplète.' });
    }

    // 3. EXTRACTION DES DONNÉES DU PANIER SHOPIFY
    // Recherche de l'article avec les propriétés personnalisées
    const productItem = order.line_items.find(item => item.properties && Object.keys(item.properties).length > 0);
    
    if (!productItem) {
      console.warn('Commande sans produit personnalisé. Aucune action Printify requise.');
      return res.status(200).json({ message: 'Commande sans produit personnalisé. Pas d\'action requise.' });
    }

    // Extrait les IDs et l'URL des propriétés de ligne de commande
    const imageUrl = productItem.properties.custom_image_url;
    const blueprintId = productItem.properties.printify_blueprint_id;
    const providerId = productItem.properties.printify_provider_id;
    
    // Le Variant ID de Printify DOIT être mappé à la variante Shopify choisie.
    // Pour simplifier, nous supposons que l'ID de variante Shopify est l'ID de variante Printify.
    const printifyVariantId = productItem.variant_id; 

    if (!imageUrl || !blueprintId || !providerId || !printifyVariantId) {
        console.error('Erreur: Données Printify (URL ou IDs) manquantes dans les propriétés de la commande.');
        return res.status(400).json({ error: 'Données de personnalisation incomplètes dans la commande Shopify.' });
    }
    
    // CORRECTION CRITIQUE: Conversion des IDs en nombres entiers (Integer) pour l'API Printify
    // Ceci résout l'erreur "blueprint_id must be an integer"
    const blueprintIdInt = parseInt(blueprintId, 10); 
    const providerIdInt = parseInt(providerId, 10); 
    const printifyVariantIdInt = parseInt(printifyVariantId, 10); 

    // 4. CRÉATION DU BROUILLON DE COMMANDE PRINTIFY (MÉTHODE ON-THE-FLY)
    // Cette méthode crée un produit temporaire (on-the-fly) et l'ordre en une seule requête.
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          // Les IDs sont maintenant envoyés comme des nombres entiers (Int)
          blueprint_id: blueprintIdInt,
          print_provider_id: providerIdInt,
          variant_id: printifyVariantIdInt,
          quantity: productItem.quantity,
          
          // Le payload "on-the-fly" nécessite l'URL (src) et les paramètres de placement
          print_areas: [
            {
              // Pour simplifier, nous supposons que le Variant ID Printify est le seul Variant ID concerné
              variant_ids: [printifyVariantIdInt], 
              placeholders: [
                {
                  position: "front", // Vous pouvez ajuster la position si nécessaire
                  images: [
                    {
                      src: imageUrl, // L'URL de Vercel Blob est utilisée ici
                      x: 0.5,
                      y: 0.5,
                      scale: 1,
                      angle: 0
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      shipping_method: 1, // 1 = Standard shipping (le plus commun)
      send_shipping_notification: true,
      address_to: {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        email: order.contact_email,
        phone: order.shipping_address.phone || 'N/A',
        country: order.shipping_address.country_code,
        region: order.shipping_address.province_code,
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2 || '',
        city: order.shipping_address.city,
        zip: order.shipping_address.zip
      }
    };

    const printifyResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(printifyPayload)
    });

    // 5. GESTION DES ERREURS ET SUCCÈS
    if (!printifyResponse.ok) {
      const errorData = await printifyResponse.json();
      console.error('Erreur CRITIQUE lors de la création de la commande Printify:', errorData);
      return res.status(500).json({ 
        error: 'Échec de la création de la commande Printify. Vérifiez les logs pour la cause (API Key, Blueprint ID ou permissions).', 
        details: errorData 
      });
    }
    
    // Succès!
    res.status(200).json({ message: 'Brouillon de commande Printify créé avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}