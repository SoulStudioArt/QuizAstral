import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // Check HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Validate Shopify webhook for security
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
    console.error('Hachage du webhook non valide.');
    return res.status(401).json({ message: 'Hachage du webhook non valide.' });
  }
  
  try {
    const order = JSON.parse(rawBody.toString('utf8'));
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;
    
    // These are required for the "on-the-fly" product creation method.
    // Ensure you have these configured in your Vercel environment variables.
    const printifyBlueprintId = process.env.PRINTIFY_BLUEPRINT_ID;
    const printifyPrintProviderId = process.env.PRINTIFY_PRINT_PROVIDER_ID;
    const printifyVariantId = process.env.PRINTIFY_VARIANT_ID;

    if (!printifyApiKey || !printifyStoreId || !printifyBlueprintId || !printifyPrintProviderId || !printifyVariantId) {
      console.error('Variables d\'environnement Printify manquantes.');
      return res.status(500).json({ error: 'Configuration Printify incomplète.' });
    }

    let imageUrl = null;
    const productItem = order.line_items.find(item => item.properties.length > 0);

    if (productItem) {
      const customImageProperty = productItem.properties.find(prop => prop.name === 'custom_image_url');
      if (customImageProperty) {
        imageUrl = customImageProperty.value;
      }
    }

    if (!imageUrl) {
      console.warn('Aucune URL d\'image personnalisée trouvée pour la commande:', order.order_number);
      return res.status(200).json({ message: 'Commande sans image personnalisée. Pas d\'action requise.' });
    }
    
    // Use the "on-the-fly" product creation method.
    // This method requires 'blueprint_id', 'print_provider_id', 'variant_id'
    // and the 'print_areas' object with the image URL in the 'src' field.
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          blueprint_id: printifyBlueprintId,
          print_provider_id: printifyPrintProviderId,
          variant_id: printifyVariantId,
          quantity: productItem.quantity,
          print_areas: [
            {
              variant_ids: [printifyVariantId],
              placeholders: [
                {
                  position: "front",
                  images: [
                    {
                      src: imageUrl, // Use the image URL directly as the API expects it here.
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
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        email: order.contact_email,
        phone: order.shipping_address.phone,
        country: order.shipping_address.country_code,
        region: order.shipping_address.province_code,
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2,
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
    
    res.status(200).json({ message: 'Brouillon de commande Printify créé avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}