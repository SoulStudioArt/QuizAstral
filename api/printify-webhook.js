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
    
    // 3. EXTRACTION DES PROPRIÉTÉS DU PANIER SHOPIFY
    // Nous accédons directement au premier article de la commande (index 0)
    const lineItem = order.line_items[0]; 
    
    if (!lineItem || !lineItem.properties) {
        console.warn('Commande sans articles ou sans propriétés personnalisées.');
        return res.status(200).json({ message: 'Commande sans produit personnalisé. Pas d\'action requise.' });
    }

    // Extraction des propriétés directement attachées (Ceci doit maintenant fonctionner)
    const properties = lineItem.properties;

    const imageUrl = properties.custom_image_url;
    const blueprintId = properties.printify_blueprint_id;
    const providerId = properties.printify_provider_id;
    const shopifyVariantId = lineItem.variant_id; // ID de la variante Shopify

    // Vérification finale des données essentielles
    if (!imageUrl || !blueprintId || !providerId || !shopifyVariantId) {
        console.error('Erreur: Données Printify manquantes.', {
            imageUrl: imageUrl, 
            blueprintId: blueprintId, 
            providerId: providerId, 
            variantId: shopifyVariantId 
        });
        // Renvoyer 400 pour éviter que Shopify ne considère le webhook comme réussi si les données sont vides
        return res.status(400).json({ error: 'Données Printify (URL ou IDs) manquantes ou mal formatées dans la commande.' });
    }
    
    // CORRECTION CRITIQUE: Conversion des IDs en nombres entiers (Integer) pour l'API Printify
    // Ceci résout l'erreur "blueprint_id must be an integer"
    const blueprintIdInt = parseInt(blueprintId, 10); 
    const providerIdInt = parseInt(providerId, 10); 
    const printifyVariantIdInt = parseInt(shopifyVariantId, 10); 

    // 4. CRÉATION DU BROUILLON DE COMMANDE PRINTIFY (MÉTHODE ON-THE-FLY)
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          blueprint_id: blueprintIdInt,
          print_provider_id: providerIdInt,
          variant_id: printifyVariantIdInt,
          quantity: lineItem.quantity,
          
          print_areas: [
            {
              variant_ids: [printifyVariantIdInt], 
              placeholders: [
                {
                  position: "front", // Assurez-vous que cette position est correcte pour votre gabarit
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
      shipping_method: 1, // 1 = Standard shipping
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
        error: 'Échec de la création de la commande Printify.', 
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