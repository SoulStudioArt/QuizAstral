import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !shopifyWebhookSecret) {
    return res.status(401).json({ message: 'Authentification manquante.' });
  }

  const rawBody = await getRawBody(req);
  const hmac = crypto.createHmac('sha256', shopifyWebhookSecret).update(rawBody).digest('base64');

  if (hmac !== hmacHeader) {
    return res.status(401).json({ message: 'Signature invalide.' });
  }
  
  try {
    const order = JSON.parse(rawBody.toString('utf8'));
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;

    // 1. FILTRAGE
    const personalizedItems = order.line_items.filter(item => 
        item.properties && item.properties.some(p => p.name === '_printify_variant_id')
    );

    if (personalizedItems.length === 0) {
      return res.status(200).json({ message: 'Aucun produit personnalisé.' });
    }

    // 2. MAPPING
    const printifyLineItems = personalizedItems.map(item => {
      const customImageProperty = item.properties.find(p => p.name.startsWith('Image Personnalisée'));
      const variantProperty = item.properties.find(p => p.name === '_printify_variant_id');
      const blueprintProperty = item.properties.find(p => p.name === '_printify_blueprint_id');
      const providerProperty = item.properties.find(p => p.name === '_printify_provider_id');

      if (!customImageProperty || !variantProperty || !blueprintProperty || !providerProperty) return null;

      return {
        variant_id: parseInt(variantProperty.value, 10),
        blueprint_id: parseInt(blueprintProperty.value, 10), 
        print_provider_id: parseInt(providerProperty.value, 10),
        quantity: item.quantity,
        print_areas: {
          "front": [
            { "src": customImageProperty.value, "x": 0.5, "y": 0.5, "scale": 1, "angle": 0 }
          ]
        },
        "print_details": { "print_on_side": "mirror" }
      };
    }).filter(Boolean);

    if (printifyLineItems.length === 0) {
        return res.status(200).json({ message: 'Données ignorées.' });
    }

    // 3. ENVOI (SÉCURISÉ)
    const printifyPayload = {
      // SÉCURITÉ : On utilise UNIQUEMENT l'ID Shopify. 
      // Si on ajoute l'heure ici, on risque de créer des vrais doublons payants.
      external_id: `shopify-order-${order.id}`, 
      line_items: printifyLineItems,
      shipping_method: 1,
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

    // 4. GESTION DES RÉPONSES
    if (!printifyResponse.ok) {
      const errorData = await printifyResponse.json();
      
      // LE FILET DE SÉCURITÉ :
      // Si Printify dit "J'ai déjà cette commande" (Code 8100), 
      // C'est une bonne nouvelle ! Ça veut dire que la commande est passée.
      // On répond 200 OK à Shopify pour qu'il arrête d'essayer.
      if (errorData.code === 8100 || (errorData.errors && errorData.errors.reason && errorData.errors.reason.includes('already exists'))) {
          console.log('Doublon bloqué avec succès (Commande déjà en sécurité chez Printify).');
          return res.status(200).json({ message: 'Déjà traitée.' });
      }

      console.error('Erreur réelle Printify:', errorData);
      return res.status(500).json({ error: 'Erreur Printify', details: errorData });
    }
    
    res.status(200).json({ message: 'Succès', orderId: order.id });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}