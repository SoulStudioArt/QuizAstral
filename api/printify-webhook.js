import crypto from 'crypto';
import fetch from 'node-fetch';

export default async function (req, res) {
  // Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Validation du webhook Shopify pour des raisons de sécurité
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  // L'authentification échoue si la clé secrète ou le header est manquant
  if (!hmacHeader || !shopifyWebhookSecret) {
    console.error('Webhook secret ou header HMAC manquant.');
    return res.status(401).json({ message: 'Erreur d\'authentification: Clé secrète ou header manquant.' });
  }
  
  // Calcul du hachage HMAC du corps de la requête
  const hmac = crypto.createHmac('sha256', shopifyWebhookSecret)
    .update(JSON.stringify(req.body))
    .digest('base64');

  // Comparaison des hachages
  if (hmac !== hmacHeader) {
    console.error('Hachage du webhook non valide.');
    return res.status(401).json({ message: 'Hachage du webhook non valide.' });
  }
  
  // Le hachage est valide, on peut traiter la commande
  try {
    const order = req.body;
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const printifyStoreId = process.env.PRINTIFY_STORE_ID;
    const printifyProductId = process.env.PRINTIFY_PRODUCT_ID;
    const printifyVariantId = process.env.PRINTIFY_VARIANT_ID;

    // Vérification des variables d'environnement Printify
    if (!printifyApiKey || !printifyStoreId || !printifyProductId || !printifyVariantId) {
      console.error('Variables d\'environnement Printify manquantes.');
      return res.status(500).json({ error: 'Configuration Printify incomplète.' });
    }

    // Recherche de l'URL de l'image personnalisée dans les propriétés de la commande
    let imageUrl = null;
    const mainProductItem = order.line_items.find(item => 
      item.properties.custom_image_url
    );

    if (mainProductItem) {
      imageUrl = mainProductItem.properties.custom_image_url;
    }

    if (!imageUrl) {
      console.warn('Aucune URL d\'image personnalisée trouvée pour la commande:', order.order_number);
      // Retourner un statut OK car il n'y a rien à faire pour Printify
      return res.status(200).json({ message: 'Commande sans image personnalisée. Pas d\'action requise.' });
    }

    // Création d'un "Blueprint" (plan d'impression) avec l'URL de l'image
    const uploadPayload = {
      file_name: `revelation-celeste-${order.id}.png`,
      url: imageUrl,
      // On peut ajouter d'autres options si nécessaire
    };

    const uploadResponse = await fetch(`https://api.printify.com/v1/uploads.json`, {
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

    // Création d'un "Draft Order" avec le "Blueprint"
    const printifyPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          product_id: printifyProductId,
          quantity: mainProductItem.quantity,
          variant_id: printifyVariantId,
          print_provider_id: "PLACEHOLDER_PROVIDER_ID", // Vous devrez remplacer cela si vous avez un fournisseur spécifique
          print_details: [
            {
              placement: "front", // Ou l'emplacement exact sur votre produit
              // L'ID du Blueprint est l'ID de l'image que nous venons d'uploader
              image_url: uploadData.url, 
            },
          ]
        }
      ],
      shipping_method: "STANDARD" // Ou tout autre méthode d'expédition que vous utilisez
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
    
    // Si la commande est créée, renvoyer une réponse de succès
    res.status(200).json({ message: 'Brouillon de commande Printify créé avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}