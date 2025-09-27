export default async function handler(req, res) {
  // On récupère les variables d'environnement telles que le serveur Vercel les voit.
  const storeId = process.env.PRINTIFY_STORE_ID;
  const apiKey = process.env.PRINTIFY_API_KEY;

  // On prépare un objet pour afficher les informations de manière claire.
  const debugInfo = {
    message: "Rapport des variables d'environnement vues par le serveur Vercel :",
    PRINTIFY_STORE_ID_UTILISÉ: storeId || "VALEUR MANQUANTE OU VIDE",
    PRINTIFY_API_KEY_PRÉSENT: apiKey ? `Oui, une clé est bien présente.` : "NON, LA CLÉ EST MANQUANTE"
  };

  // On renvoie ces informations pour pouvoir les lire dans le navigateur.
  res.status(200).json(debugInfo);
}