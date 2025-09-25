import React, { useState, useMemo, useEffect } from 'react';
import './App.css'; 

const questions = [
  { id: 'name', label: 'Quel est votre prénom ?', placeholder: 'Ex: Clara', type: 'text', required: true },
  { id: 'birthDate', label: 'Quelle est votre date de naissance ?', type: 'date', required: true },
  { id: 'birthPlace', label: 'Quelle est votre ville de naissance ?', placeholder: 'Ex: Paris', type: 'text', required: true },
  { id: 'birthTime', label: 'Quelle est votre heure de naissance ? (Optionnel)', placeholder: 'Ex: 14h30', type: 'time' },
  { id: 'personalityTrait', label: 'Décrivez-vous en un mot (ex: créatif, curieux) :', placeholder: 'Ex: Déterminé', type: 'text' },
  { id: 'biggestDream', label: 'Quel est votre plus grand rêve ou ambition ?', placeholder: 'Ex: Voyager à travers le monde', type: 'textarea' },
  { id: 'lifeLesson', label: 'Quelle est la plus grande leçon de vie que vous ayez apprise ?', placeholder: 'Ex: La patience est une vertu', type: 'textarea' },
];

const SHOPIFY_PRODUCT_HANDLE = 'mystical-eye-mandala-canvas-art-1';
const SHOPIFY_URL = 'https://soulstudioart.com';


const Quiz = () => {
  const [step, setStep] = useState(0);
  const [quizLength, setQuizLength] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState({ text: '', imageUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDigitalUnlocked, setIsDigitalUnlocked] = useState(false);
  
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageFromUrl = urlParams.get('image_url');
    if (imageFromUrl) {
      setResult(prev => ({ ...prev, imageUrl: imageFromUrl }));
      setIsDigitalUnlocked(true); // Assurer le déblocage si l'on revient de Shopify
      setStep(3);
    }
  }, []);
  
  const splitText = useMemo(() => {
    if (!result.text) return { firstHalf: '', secondHalf: '' };
    const midpoint = Math.floor(result.text.length / 2);
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
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prevAnswers) => ({ ...prevAnswers, [name]: value }));
  };

  const handleNextQuestion = () => {
    const maxQuestions = quizLength === 'short' ? 3 : 7;
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.required && !answers[currentQuestion.id]?.trim()) {
      setError('Ce champ est requis.');
      return;
    }
    setError('');
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handlePreviousQuestion = () => {
    setError('');
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleSubmit = async () => {
      // Vérification finale pour la dernière question
      const maxQuestions = quizLength === 'short' ? 3 : 7;
      const currentQuestion = questions[maxQuestions - 1];
      if (currentQuestion.required && !answers[currentQuestion.id]?.trim()) {
        setError('Ce champ est requis.');
        return;
      }
      
      setLoading(true);
      setStep(2);

      const dataToSend = { answers: answers };

      try {
          const [textResponse, imageResponse] = await Promise.all([
            fetch('/api/generate-astral-result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataToSend)
            }),
            fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataToSend)
            })
          ]);
          
          if (!textResponse.ok) {
              const errorText = await textResponse.json();
              throw new Error(errorText.error || `Erreur du serveur (texte): ${textResponse.statusText}`);
          }
          if (!imageResponse.ok) {
              const errorImage = await imageResponse.json();
              throw new Error(errorImage.error || `Erreur du serveur (image): ${imageResponse.statusText}`);
          }

          const textData = await textResponse.json();
          const imageData = await imageResponse.json();
          
          setResult({
              text: textData.text,
              imageUrl: imageData.imageUrl
          });
          setError('');

      } catch (e) {
          console.error("Erreur lors de l'appel des Vercel Functions :", e);
          setError(e.message || "Désolé, une erreur est survenue lors de la génération de votre révélation. Veuillez réessayer.");
      } finally {
          setLoading(false);
          setStep(3);
      }
  };
  
  const handleProductAction = async () => {
    if (!result.imageUrl) {
      setError('Impossible d\'effectuer cette action sans l\'image.');
      return;
    }
    
    setIsDigitalUnlocked(true); 

    const lienFinal = `${SHOPIFY_URL}/products/${SHOPIFY_PRODUCT_HANDLE}?image_url=${encodeURIComponent(result.imageUrl)}`;
    window.top.location.href = lienFinal;
  };
  
  const renderInput = (question) => {
    // Classes pour un look professionnel (bordures subtiles, focus violet)
    const commonClasses = "w-full max-w-lg mx-auto px-5 py-4 border-2 border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-300/50 focus:border-purple-600 text-gray-900 transition-all duration-300";

    if (question.type === 'textarea') {
      return (
        <textarea
          name={question.id}
          value={answers[question.id] || ''}
          onChange={handleChange}
          className={`${commonClasses} h-32 resize-none`}
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
        className={commonClasses}
        placeholder={question.placeholder}
        required={question.required}
      />
    );
  };


  const renderContent = () => {
    if (step === 0) {
      return (
        <div className="text-center space-y-10 py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-inner">
          <h2 className="text-5xl md:text-6xl font-extrabold text-indigo-900 leading-tight">
            Votre Révélation Céleste Personnalisée
          </h2>
          <p className="text-gray-700 text-xl max-w-3xl mx-auto font-light">
            Découvrez l'œuvre d'art unique conçue à partir de votre profil astral.
            Veuillez choisir la durée de votre expérience.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-8 pt-8">
            
            {/* Quiz Rapide Button - Style élégant */}
            <button
              onClick={() => { setQuizLength('short'); setStep(1); }}
              className="flex flex-col items-center p-8 w-64 h-56 bg-white border-2 border-purple-500 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-[1.03] hover:bg-purple-50 group"
            >
              <span className="text-4xl text-purple-600 mb-2">3</span>
              <span className="text-2xl text-indigo-800 font-extrabold mb-1">Profil Essentiel</span>
              <span className="text-gray-600">Rapide et direct</span>
              <span className="mt-auto text-purple-600 font-semibold">3 Questions Requises</span>
            </button>

            {/* Quiz Approfondi Button - Style principal (Violet) */}
            <button
              onClick={() => { setQuizLength('long'); setStep(1); }}
              className="flex flex-col items-center p-8 w-64 h-56 bg-purple-600 text-white rounded-xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-[1.03] hover:bg-purple-700 border-2 border-transparent group"
            >
              <span className="text-4xl text-white mb-2">7</span>
              <span className="text-2xl font-extrabold mb-1">Analyse Complète</span>
              <span className="text-purple-200">Rapport détaillé</span>
              <span className="mt-auto font-semibold">7 Questions (Recommandé)</span>
            </button>
          </div>
        </div>
      );
    }
    if (step === 1) {
      const maxQuestions = quizLength === 'short' ? 3 : 7;
      const currentQuestion = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex >= maxQuestions - 1;
      const progress = ((currentQuestionIndex + 1) / maxQuestions) * 100;

      return (
        <div className="space-y-8 text-center py-8">
          
          {/* Barre de Progression */}
          <div className="w-full max-w-xl mx-auto mb-6">
            <p className="text-lg font-semibold text-purple-600 mb-2">
              Progression: {currentQuestionIndex + 1} sur {maxQuestions}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-indigo-900 max-w-4xl mx-auto">
            {currentQuestion.label}
          </h2>
          <div className="w-full max-w-xl mx-auto pt-4">
            {renderInput(currentQuestion)}
          </div>
          
          {error && <p className="text-red-500 font-bold">{error}</p>}
          
          {/* Boutons de Navigation */}
          <div className="flex justify-center gap-4 w-full max-w-xl mx-auto pt-6">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              // Bouton Précédent sobre
              className={`px-8 py-3 rounded-full font-semibold transition duration-300 border ${currentQuestionIndex === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-purple-600 border-purple-600 hover:bg-purple-50 shadow-md'}`}
            >
              Précédent
            </button>
            <button
              onClick={isLastQuestion ? handleSubmit : handleNextQuestion}
              // Bouton Suivant principal (Violet)
              className="bg-purple-600 text-white px-8 py-3 rounded-full font-semibold shadow-xl transition-all duration-300 transform hover:scale-[1.03] hover:bg-purple-700 focus:ring-4 focus:ring-purple-300/50"
            >
              {isLastQuestion ? 'Découvrir ma Révélation' : 'Suivant'}
            </button>
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center min-h-[300px]">
          <div className="spinner"></div> 
          <h2 className="text-3xl font-bold text-indigo-900">Création de votre Révélation Céleste...</h2>
          <p className="text-gray-600 text-lg">Votre rapport personnalisé et votre œuvre d'art unique sont en cours de génération.</p>
        </div>
      );
    }

    if (step === 3) {
      
      return (
        <div className="space-y-12 py-10">
          <h2 className="text-5xl font-extrabold text-center text-indigo-900">
            Révélation Céleste pour <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">{answers.name || 'Notre Client'}</span>
          </h2>
          <div className="flex flex-col lg:flex-row gap-10 bg-white p-10 rounded-3xl shadow-xl border-t-4 border-purple-500 mx-auto">
            
            {/* Colonne de l'Œuvre d'Art et CTA */}
            <div className="lg:w-1/3 space-y-8 text-center order-2 lg:order-1">
              <h3 className="text-2xl font-bold text-indigo-900 border-b pb-2 mb-4">
                Œuvre d'Art Unique
              </h3>
              
              <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-xl shadow-lg overflow-hidden border-2 border-purple-200 mx-auto">
                <img
                    src={result.imageUrl}
                    alt="Design personnalisé"
                    className="w-full h-full object-contain p-4 transition-all duration-500"
                />
              </div>
              
              <button
                onClick={handleProductAction}
                disabled={!result.imageUrl}
                // Bouton CTA principal (Rose/Violet) - Grande taille, très visible
                className={`w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-lg shadow-2xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-purple-500/50 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`}
              >
                Créer Mon Produit Personnalisé
              </button>
              <p className="text-gray-500 italic text-sm">
                Cette action débloque également l'intégralité de votre rapport.
              </p>
            </div>

            {/* Colonne du Texte de Révélation */}
            <div className="lg:w-2/3 space-y-8 text-left lg:border-l lg:pl-8 order-1 lg:order-2">
              <h3 className="text-2xl font-bold text-indigo-900 border-b pb-2 mb-6">
                Analyse de Votre Voyage Astral
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                {splitText.firstHalf}
              </p>

              {!isDigitalUnlocked && splitText.secondHalf && (
                // Section de texte bloqué, style sobre et clair
                <div className="mt-8 p-6 bg-purple-50 border-l-4 border-purple-500 rounded-lg shadow-md">
                  <p className="text-purple-800 font-semibold">
                    Veuillez créer votre produit personnalisé pour débloquer la suite de cette analyse profonde.
                  </p>
                </div>
              )}
              
              {isDigitalUnlocked && (
                <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                  {splitText.secondHalf}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="font-sans p-4 w-full">
      <div className="w-full max-w-6xl p-8 md:p-12 bg-white rounded-3xl shadow-2xl border border-gray-200 mx-auto">
        {renderContent()}
      </div>
      {error && (
        <div className="fixed bottom-0 right-0 m-4 p-4 bg-red-600 text-white rounded-lg shadow-xl z-50">
          {error}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="bg-gray-50 p-4 w-full min-h-screen">
      <Quiz />
    </div>
  );
}