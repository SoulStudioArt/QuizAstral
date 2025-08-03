import React, { useState, useMemo } from 'react';

// Définition des questions du quiz
const questions = [
  { id: 'name', label: 'Quel est votre prénom ?', placeholder: 'Ex: Clara', type: 'text', required: true },
  { id: 'birthDate', label: 'Quelle est votre date de naissance ?', type: 'date', required: true },
  { id: 'birthPlace', label: 'Quelle est votre ville de naissance ?', placeholder: 'Ex: Paris', type: 'text', required: true },
  { id: 'birthTime', label: 'Quelle est votre heure de naissance ? (Optionnel)', placeholder: 'Ex: 14h30', type: 'time' },
  { id: 'personalityTrait', label: 'Décrivez-vous en un mot (ex: créatif, curieux) :', placeholder: 'Ex: Déterminé', type: 'text' },
  { id: 'biggestDream', label: 'Quel est votre plus grand rêve ou ambition ?', placeholder: 'Ex: Voyager à travers le monde', type: 'textarea' },
  { id: 'lifeLesson', label: 'Quelle est la plus grande leçon de vie que vous ayez apprise ?', placeholder: 'Ex: La patience est une vertu', type: 'textarea' },
];

const products = [
  { name: 'Fichier Numérique HD', price: '1,99', mockupUrl: 'https://placehold.co/600x600/E5E7EB/gray?text=Fichier+Numérique' },
  { name: 'Affiche', price: '35,00', mockupUrl: 'https://placehold.co/600x600/F5F5F5/gray?text=Affiche+Mockup' },
  { name: 'Tasse', price: '22,00', mockupUrl: 'https://placehold.co/600x600/F5F5F5/gray?text=Tasse+Mockup' },
  { name: 'T-shirt', price: '28,00', mockupUrl: 'https://placehold.co/600x600/F5F5F5/gray?text=T-shirt+Mockup' },
];

const digitalDimensions = [
  { name: 'Fond d\'écran mobile', size: '1080x1920' },
  { name: 'Impression A4', size: '2480x3508' },
  { name: 'Haute Résolution', size: '4000x4000' },
];

const Quiz = () => {
  // Définition des états de l'application
  const [step, setStep] = useState(0); // 0: choix du quiz, 1: questions, 2: chargement, 3: résultats, 4: paiement simulé
  const [quizLength, setQuizLength] = useState(null); // 'short' ou 'long'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState({ text: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [selectedDimension, setSelectedDimension] = useState(digitalDimensions[0]);
  const [shopifyProductLink, setShopifyProductLink] = useState('');
  const [isDigitalUnlocked, setIsDigitalUnlocked] = useState(false); // Nouvel état pour suivre si le contenu numérique a été acheté
  const [copyStatus, setCopyStatus] = useState('');

  // Sépare le texte en deux moitiés pour le "gating"
  const splitText = useMemo(() => {
    if (!result.text) return { firstHalf: '', secondHalf: '' };
    const midpoint = Math.floor(result.text.length / 2);
    // On cherche le dernier point ou virgule pour ne pas couper un mot
    let splitPoint = result.text.lastIndexOf('.', midpoint);
    if (splitPoint === -1) {
      splitPoint = result.text.lastIndexOf(',', midpoint);
    }
    if (splitPoint === -1) {
      splitPoint = midpoint;
    }
    const firstHalf = result.text.substring(0, splitPoint + 1);
    const secondHalf = result.text.substring(splitPoint + 1);
    return { firstHalf, secondHalf };
  }, [result.text]);
  
  // Fonction pour gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prevAnswers) => ({ ...prevAnswers, [name]: value }));
  };

  // Fonction pour passer à la question suivante
  const handleNextQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      setError('Ce champ est requis.');
      return;
    }
    setError('');
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  // Fonction pour revenir à la question précédente
  const handlePreviousQuestion = () => {
    setError('');
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  // Fonction pour lancer la génération de la révélation
  const handleSubmit = async () => {
    setLoading(true);
    setStep(2); // Passe à l'étape de chargement

    // Construction du prompt pour le texte avec toutes les réponses
    const textPrompt = `
      Créez une "Révélation Céleste" personnalisée pour une personne.
      Informations de la personne :
      - Prénom : ${answers.name || 'Non spécifié'}
      - Date de naissance : ${answers.birthDate || 'Non spécifiée'}
      - Lieu de naissance : ${answers.birthPlace || 'Non spécifié'}
      ${answers.birthTime ? `- Heure de naissance : ${answers.birthTime}\n` : ''}
      ${answers.personalityTrait ? `- Trait de personnalité : ${answers.personalityTrait}\n` : ''}
      ${answers.biggestDream ? `- Plus grand rêve : ${answers.biggestDream}\n` : ''}
      ${answers.lifeLesson ? `- Plus grande leçon de vie : ${answers.lifeLesson}\n` : ''}

      Utilisez ces informations pour offrir une interprétation profonde et personnelle.
      Le texte doit être inspiré par l'astrologie et la spiritualité.
      Adoptez un ton inspirant et poétique, dans le style "Soul Studio Art".
      Le texte doit être une révélation unique, d'environ 250 mots, et très personnalisé.
    `;

    // Construction du prompt pour l'image
    const imagePrompt = `
      Générez une œuvre d'art numérique abstraite et mystique de haute qualité, inspirée par une "Révélation Céleste".
      L'image doit incorporer des éléments visuels liés au cosmos, à l'astrologie, et à l'énergie spirituelle.
      Les couleurs doivent être vibrantes et profondes. Le style doit être élégant et moderne, comme de l'art de studio pour l'âme.
      L'image doit représenter visuellement la révélation personnalisée de ${answers.name}, en tenant compte de ses aspirations et de sa personnalité.
    `;

    try {
      // API Key est laissée vide pour que l'environnement la gère automatiquement.
      const apiKey = ""; 

      // Appel de l'API Gemini pour la génération de texte
      const payloadText = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
      const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      const responseText = await fetch(apiUrlText, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadText)
      });
      const resultText = await responseText.json();
      const generatedText = resultText?.candidates?.[0]?.content?.parts?.[0]?.text || "Impossible de générer le texte.";
      setResult(prev => ({ ...prev, text: generatedText }));

      // Appel de l'API Imagen pour la génération d'image
      const payloadImage = { instances: { prompt: imagePrompt }, parameters: { "sampleCount": 1 } };
      const apiUrlImage = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const responseImage = await fetch(apiUrlImage, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadImage)
      });
      const resultImage = await responseImage.json();
      const base64Data = resultImage?.predictions?.[0]?.bytesBase64Encoded;
      if (base64Data) {
        const imageUrl = `data:image/png;base64,${base64Data}`;
        setResult(prev => ({ ...prev, imageUrl }));
      } else {
        // En cas d'échec de l'image, on utilise un fallback
        setResult(prev => ({ ...prev, imageUrl: 'https://placehold.co/500x500?text=Image+non+disponible' }));
      }
    } catch (e) {
      console.error("Erreur lors de l'appel de l'API :", e);
      setError("Désolé, une erreur est survenue lors de la génération de votre révélation. Veuillez réessayer.");
    } finally {
      setLoading(false);
      setStep(3); // Passe à l'étape des résultats
    }
  };
  
  // Fonction pour gérer l'action du produit
  const handleProductAction = () => {
    if (!result.imageUrl) {
      setError('Impossible d\'effectuer cette action sans l\'image.');
      return;
    }

    // Le client peut acheter n'importe quel produit pour débloquer la suite du texte.
    setIsDigitalUnlocked(true);

    if (selectedProduct.name === 'Fichier Numérique HD') {
      setStep(4); // Passe à l'étape de paiement simulé
    } else {
      // Logic for creating the Shopify link for physical products
      const encodedTitle = encodeURIComponent(`"Révélation Céleste" pour ${answers.name}`);
      const encodedBody = encodeURIComponent(`<p>${result.text}</p>`);
      const encodedImage = encodeURIComponent(result.imageUrl.split(',')[1]); // Enlever le préfixe data:image/png;base64,
      
      const shopifyURL = `https://[NOM_DE_VOTRE_BOUTIQUE].myshopify.com/admin/products/new?product[title]=${encodedTitle}&product[body_html]=${encodedBody}&image[attachment]=${encodedImage}`;
      
      // Ouverture d'une nouvelle fenêtre pour le lien Shopify
      window.open(shopifyURL, '_blank');
      setShopifyProductLink(shopifyURL);
    }
  };
  
  // Fonction pour copier le lien dans le presse-papiers
  const copyToClipboard = () => {
    const el = document.createElement('textarea');
    el.value = shopifyProductLink;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopyStatus('Lien copié !');
    setTimeout(() => setCopyStatus(''), 2000); // Réinitialise le message après 2 secondes
  };
  
  // Fonction pour télécharger le fichier après la "simulation de paiement"
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `RevelationCeleste_${answers.name}_${selectedDimension.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStep(3);
  };

  // Rendu des différentes étapes du quiz
  const renderContent = () => {
    // Étape 0: Choix du quiz
    if (step === 0) {
      return (
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900">Bienvenue dans l'univers de Soul Studio Art</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Préparez-vous à découvrir votre "Révélation Céleste" personnalisée, accompagnée d'une œuvre d'art unique.
            Choisissez la durée de votre voyage.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            <button
              onClick={() => { setQuizLength('short'); setStep(1); }}
              className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
            >
              Quiz Rapide (3 Questions)
            </button>
            <button
              onClick={() => { setQuizLength('long'); setStep(1); }}
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105"
            >
              Quiz Approfondi (7 Questions)
            </button>
          </div>
        </div>
      );
    }

    // Étape 1: Questions
    if (step === 1) {
      const maxQuestions = quizLength === 'short' ? 3 : 7;
      const currentQuestion = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex >= maxQuestions - 1;

      const renderInput = (question) => {
        if (question.type === 'textarea') {
          return (
            <textarea
              name={question.id}
              value={answers[question.id] || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
              placeholder={question.placeholder}
              required={question.required}
            />
          );
        }
        return (
          <input
            type={question.type}
            id={question.id}
            name={question.id}
            value={answers[question.id] || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={question.placeholder}
            required={question.required}
          />
        );
      };

      return (
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold text-indigo-900">
            Question {currentQuestionIndex + 1} sur {maxQuestions}
          </h2>
          <p className="text-gray-700 font-semibold">{currentQuestion.label}</p>
          <div className="w-full max-w-md mx-auto">
            {renderInput(currentQuestion)}
          </div>
          {error && <p className="text-red-500 font-bold">{error}</p>}
          <div className="flex justify-between w-full max-w-md mx-auto pt-4">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-bold transition duration-300 ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
            >
              Précédent
            </button>
            <button
              onClick={isLastQuestion ? handleSubmit : handleNextQuestion}
              className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition duration-300"
            >
              {isLastQuestion ? 'Découvrir ma Révélation' : 'Suivant'}
            </button>
          </div>
        </div>
      );
    }

    // Étape 2: Chargement
    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-bold text-indigo-900">Création de votre Révélation Céleste...</h2>
          <p className="text-gray-600">Votre rapport et votre œuvre d'art sont en cours de création. Cela peut prendre quelques instants.</p>
        </div>
      );
    }

    // Étape 3: Résultats avec visualisation et texte tronqué ou complet
    if (step === 3) {
      // Fonction pour gérer l'affichage de la visualisation du produit
      const renderProductVisualization = () => {
        if (!result.imageUrl) {
          return <p className="text-gray-500">Image en cours de chargement...</p>;
        }
        
        switch (selectedProduct.name) {
          case 'Affiche':
            return (
              <div className="relative w-full aspect-[4/3] bg-gray-200 rounded-2xl shadow-inner overflow-hidden">
                {/* Mockup de l'affiche */}
                <img
                  src="https://placehold.co/800x600/F5F5F5/gray?text=Affiche+Mockup"
                  alt="Affiche sur un mur"
                  className="w-full h-full object-cover"
                />
                {/* Votre image générée est superposée sur le mockup */}
                <img
                  src={result.imageUrl}
                  alt="Design d'affiche"
                  className="absolute inset-[15%] w-[70%] h-[70%] object-contain"
                />
              </div>
            );
          case 'Tasse':
            return (
              <div className="relative w-full aspect-square bg-gray-200 rounded-2xl shadow-inner overflow-hidden">
                <img
                  src="https://placehold.co/600x600/F5F5F5/gray?text=Tasse+Mockup"
                  alt="Tasse avec un design"
                  className="w-full h-full object-cover"
                />
                <img
                  src={result.imageUrl}
                  alt="Design de tasse"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 object-contain"
                />
              </div>
            );
          case 'T-shirt':
            return (
              <div className="relative w-full aspect-square bg-gray-200 rounded-2xl shadow-inner overflow-hidden">
                <img
                  src="https://placehold.co/600x600/F5F5F5/gray?text=T-shirt+Mockup"
                  alt="T-shirt avec un design"
                  className="w-full h-full object-cover"
                />
                <img
                  src={result.imageUrl}
                  alt="Design de t-shirt"
                  className="absolute top-[25%] left-1/2 -translate-x-1/2 w-1/2 h-1/2 object-contain"
                />
              </div>
            );
          default: // Fichier Numérique HD
            return (
              <div className="relative w-full aspect-square bg-gray-200 rounded-2xl shadow-inner overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt="Fichier numérique haute résolution"
                  className="w-full h-full object-contain"
                />
              </div>
            );
        }
      };

      return (
        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-center text-indigo-900">
            Votre Révélation Céleste, {answers.name || 'Cher Voyageur'}
          </h2>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Colonne du texte */}
            <div className="lg:w-2/3 space-y-6">
              <div className="p-6 bg-gray-50 rounded-xl shadow-inner">
                <h3 className="text-2xl font-bold text-indigo-900 mb-4">Votre Voyage Astral</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{splitText.firstHalf}</p>
                {/* Section pour débloquer le reste du texte */}
                {!isDigitalUnlocked && splitText.secondHalf && (
                  <div className="mt-6 p-6 bg-indigo-100 border-l-4 border-indigo-500 rounded-lg shadow-md">
                    <p className="text-indigo-800 font-semibold">
                      Pour débloquer la suite de votre voyage astral et tous ses secrets, finalisez votre achat.
                    </p>
                  </div>
                )}
                {isDigitalUnlocked && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{splitText.secondHalf}</p>
                )}
              </div>
            </div>
            {/* Colonne de visualisation et d'options */}
            <div className="lg:w-1/3 space-y-4">
              <h3 className="text-3xl font-serif font-bold text-indigo-900">Votre Œuvre d'Art Unique</h3>
              {renderProductVisualization()}
              <p className="text-gray-600 italic text-center text-sm">
                Cette œuvre d'art abstraite et mystique capture l'essence de votre profil astral,
                fusionnant l'astrologie avec une esthétique moderne et vibrante.
              </p>

              <h3 className="text-2xl font-bold text-indigo-900 pt-4">Finalisez votre achat</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-4 rounded-xl text-center text-lg font-bold transition-all duration-300 shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50
                        ${selectedProduct.name === product.name
                          ? 'bg-indigo-600 text-white shadow-indigo-500/40'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {product.name}
                      <p className="text-sm font-normal mt-1 opacity-80">{product.price} CAD</p>
                    </button>
                  ))}
                </div>
                
                {selectedProduct.name === 'Fichier Numérique HD' ? (
                  // Bloc pour le produit numérique
                  <div className="space-y-4 pt-4">
                    <h4 className="text-lg font-bold text-indigo-900">Choisissez une dimension</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {digitalDimensions.map((dim, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedDimension(dim)}
                          className={`p-2 rounded-lg text-center text-sm font-bold transition-all duration-300
                            ${selectedDimension.name === dim.name
                              ? 'bg-indigo-500 text-white shadow-indigo-400/40'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {dim.name}
                          <p className="text-xs font-normal mt-1 opacity-80">{dim.size}</p>
                        </button>
                      ))}
                    </div>
                    {/* Bouton pour les produits numériques, placé à cet endroit */}
                    <button
                      onClick={handleProductAction}
                      disabled={!result.imageUrl}
                      className={`w-full py-4 bg-indigo-600 text-white text-xl font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Acheter et Télécharger
                    </button>
                  </div>
                ) : (
                  // Bouton pour les produits physiques
                  <button
                    onClick={handleProductAction}
                    disabled={!result.imageUrl}
                    className={`w-full py-4 bg-indigo-600 text-white text-xl font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Créer le produit sur Shopify
                  </button>
                )}
                
                {shopifyProductLink && (
                  <div className="p-4 bg-indigo-100 rounded-xl text-sm break-words relative">
                    <p className="text-indigo-800 font-semibold mb-2">
                      Lien Shopify généré :
                    </p>
                    <a
                      href={shopifyProductLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline hover:no-underline"
                    >
                      Cliquer pour ouvrir le lien
                    </a>
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-1 right-1 p-1 rounded-full bg-indigo-200 text-indigo-600 hover:bg-indigo-300"
                      title="Copier le lien"
                    >
                      {/* SVG pour l'icône de copie */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2.25M12 9l-3 3m0 0l3 3m-3-3h6" />
                      </svg>
                    </button>
                    {copyStatus && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-indigo-500 text-white text-xs rounded-lg shadow-md animate-fade-in">
                        {copyStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Étape 4: Page de paiement simulée pour le fichier numérique
    if (step === 4) {
      return (
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-indigo-900">Détails de votre commande</h2>
          <p className="text-gray-700">Vous êtes sur le point d'acheter le **Fichier Numérique HD**.</p>
          <div className="p-6 bg-gray-100 rounded-xl shadow-inner max-w-sm mx-auto">
            <img
              src={result.imageUrl}
              alt="Design généré par le quiz"
              className="rounded-lg shadow-md mb-4 w-full"
            />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Produit :</span>
              <span>Fichier Numérique HD</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Dimension :</span>
              <span>{selectedDimension.name} ({selectedDimension.size})</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Prix :</span>
              <span>1,99 CAD</span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="w-full max-w-sm py-4 bg-indigo-600 text-white text-xl font-bold rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
          >
            Payer et Télécharger
          </button>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans p-4">
      <div className="w-full max-w-6xl p-8 md:p-12 bg-white rounded-3xl shadow-xl border border-gray-200">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Quiz />
    </div>
  );
}
