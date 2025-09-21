import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body';

export default async function (req, res) {
  // Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Validation du webhook Shopify pour des raisons de sécurité
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
    
    // Assurez-vous d'avoir les IDs pour le blueprint et le fournisseur d'impression
    // Ces variables sont nécessaires pour la création d'un produit
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
    
    // Étape 1: Télécharger l'image sur Printify.
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

    const uploadData = await uploadResponse.json();
    
    if (!uploadResponse.ok || !uploadData.id) {
        console.error('Erreur lors de l\'upload de l\'image sur Printify:', uploadData);
        return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image personnalisée.', details: uploadData });
    }

    const uploadedImageId = uploadData.id;

    // Étape 2: Créer un produit personnalisé sur Printify avec l'image téléchargée.
    const productPayload = {
        title: `Produit personnalisé pour commande #${order.id}`,
        blueprint_id: printifyBlueprintId,
        print_provider_id: printifyPrintProviderId,
        variants: [
            {
                id: printifyVariantId,
                price: 1000 // Prix en cents. Ajustez selon vos besoins
            }
        ],
        print_areas: [
            {
                variant_ids: [printifyVariantId],
                placeholders: [
                    {
                        position: "front", // Ou 'left_leg', 'right_leg', etc.
                        images: [
                            {
                                id: uploadedImageId,
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
    };
    
    const productResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/products.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${printifyApiKey}`
        },
        body: JSON.stringify(productPayload)
    });
    
    const productData = await productResponse.json();
    
    if (!productResponse.ok || !productData.id) {
        console.error('Erreur lors de la création du produit sur Printify:', productData);
        return res.status(500).json({ error: 'Erreur lors de la création du produit personnalisé.', details: productData });
    }
    
    const createdProductId = productData.id;

    // Étape 3: Créer la commande en utilisant le produit que vous venez de créer.
    const orderPayload = {
      external_id: `shopify-order-${order.id}`,
      line_items: [
        {
          product_id: createdProductId,
          quantity: productItem.quantity,
          variant_id: printifyVariantId,
        }
      ],
      shipping_method: 1
    };

    const orderResponse = await fetch(`https://api.printify.com/v1/shops/${printifyStoreId}/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${printifyApiKey}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('Erreur de l\'API Printify:', errorData);
      return res.status(500).json({ error: 'Erreur lors de la création de la commande Printify.', details: errorData });
    }
    
    res.status(200).json({ message: 'Brouillon de commande Printify créé avec succès.', orderId: order.id });

  } catch (error) {
    console.error('Erreur lors du traitement du webhook Shopify:', error);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
}