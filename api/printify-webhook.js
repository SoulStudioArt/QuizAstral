import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // --- Section 1: Validation du Webhook Shopify (inchangée) ---
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

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

    // ====================== MODIFICATION 1 : Utiliser .filter() ======================
    // On récupère TOUS les articles personnalisés, pas seulement le premier.
    const personalizedItems = order.line_items.filter(item => 
        item.properties && item.properties.some(p => p.name === '_printify_variant_id')
    );

    if (personalizedItems.length === 0) {
      console.log('Commande sans items personnalisés Printify. Aucune action requise.');
      return res.status(200).json({ message: 'Aucun item personnalisé Printify.' });
    }

    // ====================== MODIFICATION 2 : Construire une liste d'articles ======================
    // On utilise .map() pour transformer chaque article Shopify en un article au format Printify.
    const printifyLineItems = personalizedItems.map(item => {
      // On cherche les propriétés spécifiques à CET article.
      const customImageProperty = item.properties.find(prop => prop.name.startsWith('Image Personnalisée'));
      const variantProperty = item.properties.find(prop => prop.name === '_printify_variant_id');
      const blueprintProperty = item.properties.find(p => p.name === '_printify_blueprint_id');
      const providerProperty = item.properties.find(p => p.name === '_printify_provider_id');

      // Si une des propriétés manque pour cet article, on retourne null pour le filtrer plus tard.
      if (!customImageProperty || !variantProperty || !blueprintProperty || !providerProperty) {
        console.error('Données de personnalisation manquantes pour un article:', item.sku);
        return null;
      }
      
      const imageUrl = customImageProperty.value;
      const printifyVariantId = parseInt(variantProperty.value, 10);
      const printifyBlueprintId = parseInt(blueprintProperty.value, 10);
      const printifyPrintProviderId = parseInt(providerProperty.value, 10);

      // On retourne l'objet au format attendu par l'API Printify.
      return {
        variant_id: printifyVariantId,
        blueprint_id: printifyBlueprintId, 
        print_provider_id: printifyPrintProviderId,
        quantity: item.quantity,
        print_areas: {
          "front": [
            { "src": imageUrl, "x": 0.5, "y": 0.5, "scale": 1, "angle": 0 }
          ]
        },
        "print_details": {
          "print_on_side": "mirror"
        }
      };
    }).filter(Boolean); // .filter(Boolean) retire tous les 'null' de la liste.

    // Si après le mapping, aucun article n'est valide, on s'arrête.
    if (printifyLineItems.length === 0) {
        console.error('Aucun article valide à envoyer à Printify pour la commande:', order.order_number);
        return res.status(400).json({ error: 'Aucun article valide à envoyer à Printify.' });
    }

    // --- Section 4: Construction et envoi de la commande à Printify ---
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: printifyLineItems, // <-- On utilise notre nouvelle liste d'articles
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