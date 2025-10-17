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

    // On cherche le produit qui a nos propriétés personnalisées
    const productItem = order.line_items.find(item => item.properties && item.properties.length > 0);

    if (!productItem) {
      console.log('Commande sans items personnalisés. Aucune action requise.');
      return res.status(200).json({ message: 'Aucun item personnalisé.' });
    }

    // ==========================================================
    // === CORRECTION N°1 : On cherche le bon nom de propriété ===
    // ==========================================================
    const customImageProperty = productItem.properties.find(prop => prop.name === 'Image Personnalisée');
    const imageUrl = customImageProperty ? customImageProperty.value : null;

    if (!imageUrl) {
      console.warn('Aucune URL d\'image personnalisée trouvée pour la commande:', order.order_number);
      return res.status(200).json({ message: 'Commande sans image personnalisée. Pas d\'action requise.' });
    }

    // ======================================================================================
    // === CORRECTION N°2 : On récupère l'ID de variante Printify depuis la commande Shopify ===
    // ======================================================================================
    const printifyVariantProperty = productItem.properties.find(prop => prop.name === '_printify_variant_id');
    const printifyVariantId = printifyVariantProperty ? parseInt(printifyVariantProperty.value, 10) : null;
    
    // On a besoin du blueprint_id et du print_provider_id aussi. Il faut les ajouter aux propriétés du panier !
    // Pour l'instant, on va les mettre en dur, mais il faudra les ajouter.
    // NOTE : Assurez-vous que ces IDs correspondent au type de produit (ex: Toile)
    const printifyBlueprintId = 1159; // ID pour "Matte Canvas, Stretched"
    const printifyPrintProviderId = 105; // ID pour "SPOKE Custom Products" (exemple)

    if (!printifyVariantId) {
      console.error('Impossible de trouver _printify_variant_id dans les propriétés de la commande:', order.order_number);
      return res.status(400).json({ error: 'Données de commande Printify manquantes.' });
    }
    
    // Construction du payload pour l'API Printify
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          // On utilise maintenant les IDs dynamiques et récupérés
          variant_id: printifyVariantId,
          blueprint_id: printifyBlueprintId, 
          print_provider_id: printifyPrintProviderId,
          quantity: productItem.quantity,
          print_areas: [
            {
              placeholders: [
                {
                  position: "front",
                  images: [ { src: imageUrl, x: 0.5, y: 0.5, scale: 1, angle: 0 } ]
                }
              ]
            }
          ]
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