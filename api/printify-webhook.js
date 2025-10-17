import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // 1. Vérification de la méthode POST (inchangé)
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // 2. Validation du webhook Shopify (inchangé)
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !shopifyWebhookSecret) {
    console.error('Webhook secret ou header HMAC manquant.');
    return res.status(401).json({ message: 'Erreur d\'authentification.' });
  }

  const rawBody = await getRawBody(req);
  const hmac = crypto.createHmac('sha256', shopifyWebhookSecret).update(rawBody).digest('base64');

  if (hmac !== hmacHeader) {
    console.error('Hachage du webhook non valide.');
    return res.status(401).json({ message: 'Hachage du webhook non valide.' });
  }
  
  try {
    const order = JSON.parse(rawBody.toString('utf8'));
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;

    if (!printifyApiKey || !printifyStoreId) {
      console.error('Variables d\'environnement Printify manquantes.');
      return res.status(500).json({ error: 'Configuration Printify incomplète.' });
    }

    const productItem = order.line_items.find(item => item.properties && item.properties.length > 0);

    if (!productItem) {
      console.log('Commande sans items personnalisés. Aucune action requise.');
      return res.status(200).json({ message: 'Aucun item personnalisé.' });
    }

    const customImageProperty = productItem.properties.find(prop => prop.name === 'Image Personnalisée');
    const imageUrl = customImageProperty ? customImageProperty.value : null;

    if (!imageUrl) {
      console.warn('Aucune URL d\'image personnalisée trouvée pour la commande:', order.order_number);
      return res.status(200).json({ message: 'Commande sans image personnalisée. Pas d\'action requise.' });
    }

    const printifyVariantProperty = productItem.properties.find(prop => prop.name === '_printify_variant_id');
    const printifyVariantId = printifyVariantProperty ? parseInt(printifyVariantProperty.value, 10) : null;
    
    // NOTE : On récupère ces valeurs depuis les variables d'environnement.
    // Assurez-vous qu'elles correspondent au produit "Toile".
    const printifyBlueprintId = parseInt(process.env.PRINTIFY_BLUEPRINT_ID, 10);
    const printifyPrintProviderId = parseInt(process.env.PRINTIFY_PRINT_PROVIDER_ID, 10);

    if (!printifyVariantId || !printifyBlueprintId || !printifyPrintProviderId) {
      console.error('Données Printify manquantes (variant, blueprint ou provider ID) pour la commande:', order.order_number);
      return res.status(400).json({ error: 'Données de commande Printify manquantes.' });
    }
    
    // Construction du payload pour l'API Printify
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          variant_id: printifyVariantId,
          blueprint_id: printifyBlueprintId, 
          print_provider_id: printifyPrintProviderId,
          quantity: productItem.quantity,
          // =====================================================================
          // === LA CORRECTION EST ICI : J'ai restauré la bonne structure       ===
          // =====================================================================
          print_areas: {
            "front": [
              {
                "src": imageUrl,
                "x": 0.5,
                "y": 0.5,
                "scale": 1,
                "angle": 0
              }
            ]
          }
        }
      ],
      shipping_method: 1, // Méthode de livraison standard
      send_shipping_notification: true,
      address_to: {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        email: order.contact_email,
        phone: order.shipping_address.phone || 'N/A',
        country: order.shipping_address.country_code,
        region: order.shipping_address.province_code || '',
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

    if (!printifyResponse.ok) {
      const errorData = await printifyResponse.json();
      console.error('Erreur de l\'API Printify:', errorData);
      return res.status(500).json({ error: 'Erreur lors de la création de la commande Printify.', details: errorData });
    }
    
    res.status(200).json({ message: 'Commande Printify créée avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}