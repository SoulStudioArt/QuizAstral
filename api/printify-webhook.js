import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // Check if the HTTP method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Get the HMAC header and the secret key from Vercel's environment variables
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // If the secret or the header is missing, return an authentication error
  if (!hmacHeader || !shopifyWebhookSecret) {
    console.error('Webhook secret ou header HMAC manquant.');
    return res.status(401).json({ message: 'Erreur d\'authentification: Clé secrète ou header manquant.' });
  }
  
  // Read the raw request body as a buffer. This is the most reliable way to validate webhooks.
  const rawBody = await getRawBody(req);
  
  // Calculate the HMAC hash of the raw body
  const hmac = crypto.createHmac('sha256', shopifyWebhookSecret)
    .update(rawBody)
    .digest('base64');

  // Compare the calculated hash with the one from Shopify
  if (hmac !== hmacHeader) {
    console.error('Hachage du webhook non valide.');
    return res.status(401).json({ message: 'Hachage du webhook non valide.' });
  }
  
  // If validation is successful, process the order
  try {
    const order = JSON.parse(rawBody.toString('utf8')); // Parse the raw body as JSON
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;
    const printifyProductId = process.env.PRINTIFY_PRODUCT_ID;
    const printifyVariantId = process.env.PRINTIFY_VARIANT_ID;
    const printifyPrintProviderId = 35; // L'ID pour le fournisseur Jondo
    
    // Check for missing Printify environment variables
    if (!printifyApiKey || !printifyStoreId || !printifyProductId || !printifyVariantId || !printifyPrintProviderId) {
      console.error('Variables d\'environnement Printify manquantes.');
      return res.status(500).json({ error: 'Configuration Printify incomplète.' });
    }

    // Find the custom image URL in the order properties
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
      // Return a 200 OK status, as no action is needed for Printify
      return res.status(200).json({ message: 'Commande sans image personnalisée. Pas d\'action requise.' });
    }

    // Upload the image to Printify
    const uploadPayload = {
      file_name: `revelation-celeste-${order.id}.png`,
      url: imageUrl,
    };

    const uploadResponse = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(uploadPayload)
    });

    if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Erreur lors de l\'upload de l\'image sur Printify:', errorData);
        return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image personnalisée.' });
    }

    const uploadData = await uploadResponse.json();
    const blueprintId = uploadData.id;

    // Create the Printify Draft Order
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          product_id: printifyProductId,
          quantity: productItem.quantity,
          variant_id: printifyVariantId,
          print_provider_id: printifyPrintProviderId,
          print_details: [
            {
              placement: "front",
              blueprint_id: blueprintId,
            },
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
      return res.status(500).json({ error: 'Erreur lors de la création de la commande Printify.' });
    }
    
    res.status(200).json({ message: 'Brouillon de commande Printify créé avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}