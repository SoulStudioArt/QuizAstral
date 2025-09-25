import React, { useState, useMemo, useEffect } from 'react';
import './App.css'; // Assurez-vous que votre fichier CSS est toujours là, même si la plupart des styles sont inline via Tailwind

// Définitions du quiz (inchangées)
const questions = [
  { id: 'name', label: 'Quel est votre prénom ?', placeholder: 'Ex: Clara', type: 'text', required: true },
  { id: 'birthDate', label: 'Quelle est votre date de naissance ?', type: 'date', required: true },
  { id: 'birthPlace', label: 'Quelle est votre ville de naissance ?', placeholder: 'Ex: Paris', type: 'text', required: true },
  { id: 'birthTime', label: 'Quelle est votre heure de naissance ? (Optionnel)', placeholder: 'Ex: 14h30', type: 'time' },
  { id: 'personalityTrait', label: 'Décrivez-vous en un mot (ex: créatif, curieux) :', placeholder: 'Ex: Déterminé', type: 'text' },
  { id: 'biggestDream', label: 'Quel est votre plus grand rêve ou ambition ?', placeholder: 'Ex: Voyager à travers le monde', type: 'textarea' },
  { id: 'lifeLesson', label: 'Quelle est la plus grande leçon de vie que vous ayez apprise ?', placeholder: 'Ex: La patience est une vertu', type: 'textarea' },
];

// Constantes de redirection (inchangées)
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
    if (currentQuestion.required && !answers[currentQuestion.id]) {
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

    const lienFinal = `${SHOPIFY_URL}/products/${SHOPIFY_PRODUCT_HANDLE}?image_url=${result.imageUrl}`;
    window.top.location.href = lienFinal;
  };

  const renderContent = () => {
    if (step === 0) {
      return (
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-yellow-400">
            Bienvenue dans l'univers de Soul Studio Art
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Préparez-vous à découvrir votre **"Révélation Céleste"** personnalisée, accompagnée d'une œuvre d'art unique.
            Choisissez la durée de votre voyage.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            <button
              onClick={() => { setQuizLength('short'); setStep(1); }}
              className="bg-purple-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-purple-600 transition-all duration-300 transform hover:scale-105 shadow-purple-500/50"
            >
              Quiz Rapide (3 Questions)
            </button>
            <button
              onClick={() => { setQuizLength('long'); setStep(1); }}
              className="bg-transparent text-yellow-400 border-2 border-yellow-400 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-yellow-400/10 transition-all duration-300 transform hover:scale-105"
            >
              Quiz Approfondi (7 Questions)
            </button>
          </div>
        </div>
      );
    }
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
              className="w-full px-4 py-3 border border-purple-500 bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 h-32 resize-none"
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
            className="w-full px-4 py-3 border border-purple-500 bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder={question.placeholder}
            required={question.required}
          />
        );
      };

      return (
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-serif font-bold text-yellow-400">
            Question {currentQuestionIndex + 1} sur {maxQuestions}
          </h2>
          <p className="text-gray-300 font-semibold">{currentQuestion.label}</p>
          <div className="w-full max-w-md mx-auto">
            {renderInput(currentQuestion)}
          </div>
          {error && <p className="text-red-400 font-bold">{error}</p>}
          <div className="flex justify-between w-full max-w-md mx-auto pt-4">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`bg-purple-800/50 text-gray-300 px-6 py-3 rounded-full font-bold transition duration-300 shadow-lg ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
            >
              Précédent
            </button>
            <button
              onClick={isLastQuestion ? handleSubmit : handleNextQuestion}
              className="bg-yellow-600 text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-yellow-500 transition duration-300 transform hover:scale-105 shadow-yellow-500/50"
            >
              {isLastQuestion ? 'Découvrir ma Révélation' : 'Suivant'}
            </button>
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="spinner"></div> {/* Assurez-vous que votre style de spinner est bien visible sur fond sombre */}
          <h2 className="text-xl font-bold text-yellow-400">Création de votre Révélation Céleste...</h2>
          <p className="text-gray-300">Votre rapport et votre œuvre d'art sont en cours de création. Cela peut prendre quelques instants.</p>
        </div>
      );
    }

    if (step === 3) {
      
      return (
        <div className="space-y-8">
          <h2 className="text-4xl font-serif font-bold text-center text-yellow-400">
            Votre Révélation Céleste, {answers.name || 'Cher Voyageur'}
          </h2>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 space-y-6">
              <div className="p-8 bg-black/30 rounded-xl shadow-2xl backdrop-blur-md border border-purple-700/50">
                <h3 className="text-3xl font-serif font-bold text-yellow-400 mb-4">Votre Voyage Astral</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{splitText.firstHalf}</p>
                {!isDigitalUnlocked && splitText.secondHalf && (
                  <div className="mt-6 p-6 bg-purple-900/40 border-l-4 border-yellow-500 rounded-lg shadow-xl">
                    <p className="text-gray-200 font-semibold italic">
                      Débloquez la suite de votre voyage astral et choisissez votre produit en cliquant sur le bouton ci-contre.
                    </p>
                  </div>
                )}
                {isDigitalUnlocked && (
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{splitText.secondHalf}</p>
                )}
              </div>
            </div>
            
            <div className="lg:w-1/3 space-y-4">
              <h3 className="text-3xl font-serif font-bold text-yellow-400">Votre Œuvre d'Art Unique</h3>
              
              <div className="relative w-full aspect-[4/3] bg-purple-900/50 rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400/50">
                <img
                    src={result.imageUrl}
                    alt="Design personnalisé"
                    className="w-full h-full object-contain p-4"
                />
              </div>

              <p className="text-gray-400 italic text-center text-sm">
                Cette œuvre d'art abstraite et mystique capture l'essence de votre profil astral.
              </p>
              
              <button
                onClick={handleProductAction}
                disabled={!result.imageUrl}
                className={`w-full py-4 bg-yellow-600 text-gray-900 text-xl font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400/70 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed' : 'shadow-yellow-500/50'}`}
              >
                Créer mon Produit Personnalisé
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black/90 font-sans p-4" style={{backgroundImage: 'radial-gradient(circle at center, rgba(30, 20, 50, 0.9) 0%, rgba(10, 10, 20, 1) 100%)'}}>
      <div className="w-full max-w-6xl p-8 md:p-12 bg-black/40 rounded-3xl shadow-2xl border border-purple-900/50 backdrop-blur-sm">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <Quiz />
    </div>
  );
}