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
    
    const printifyProductId = process.env.PRINTIFY_PRODUCT_ID;
    const printifyVariantId = process.env.PRINTIFY_VARIANT_ID;

    if (!printifyApiKey || !printifyStoreId || !printifyProductId || !printifyVariantId) {
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
    
    // Étape 1: Créer un "Draft Order" en utilisant l'URL de l'image.
    // L'API Printify pour la création d'une commande personnalisée via 'print_areas'
    // attend un URL dans le champ 'src' et non un ID d'image.
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          product_id: printifyProductId,
          quantity: productItem.quantity,
          variant_id: printifyVariantId,
          print_areas: [
            {
              variant_ids: [printifyVariantId],
              placeholders: [
                {
                  position: "front",
                  images: [
                    {
                      src: imageUrl, // Utilisez l'URL de l'image originale ici.
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
      shipping_method: 1
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