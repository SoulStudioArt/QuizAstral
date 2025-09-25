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
        <div className="text-center space-y-10 py-12">
          <h2 className="text-4xl md:text-5xl font-bold text-indigo-900">
            Bienvenue dans l'univers de Soul Studio Art
          </h2>
          <p className="text-gray-700 text-lg max-w-3xl mx-auto">
            Préparez-vous à découvrir votre "Révélation Céleste" personnalisée, accompagnée d'une œuvre d'art unique.
            Choisissez la durée de votre voyage.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-6 pt-6">
            <button
              onClick={() => { setQuizLength('short'); setStep(1); }}
              className="bg-indigo-600 text-white px-10 py-4 rounded-lg font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
            >
              Quiz Rapide (3 Questions)
            </button>
            <button
              onClick={() => { setQuizLength('long'); setStep(1); }}
              className="bg-white text-indigo-600 border-2 border-indigo-600 px-10 py-4 rounded-lg font-bold text-lg shadow-xl hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105"
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
              className="w-full max-w-lg mx-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 h-32 resize-none text-gray-900"
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
            className="w-full max-w-lg mx-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-900"
            placeholder={question.placeholder}
            required={question.required}
          />
        );
      };

      return (
        <div className="space-y-8 text-center py-8">
          <p className="text-lg font-semibold text-gray-500">
            Étape {currentQuestionIndex + 1} sur {maxQuestions}
          </p>
          <h2 className="text-3xl font-bold text-indigo-900 max-w-4xl mx-auto">
            {currentQuestion.label}
          </h2>
          <div className="w-full max-w-xl mx-auto pt-4">
            {renderInput(currentQuestion)}
          </div>
          {error && <p className="text-red-500 font-bold">{error}</p>}
          <div className="flex justify-center gap-4 w-full max-w-xl mx-auto pt-6">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`bg-gray-200 text-gray-800 px-8 py-4 rounded-lg font-bold transition duration-300 shadow-lg ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
            >
              Précédent
            </button>
            <button
              onClick={isLastQuestion ? handleSubmit : handleNextQuestion}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-bold shadow-xl hover:bg-indigo-700 transition duration-300"
            >
              {isLastQuestion ? 'Découvrir ma Révélation' : 'Suivant'}
            </button>
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center">
          <div className="spinner"></div> 
          <h2 className="text-2xl font-bold text-indigo-900">Création de votre Révélation Céleste...</h2>
          <p className="text-gray-600 text-lg">Votre rapport et votre œuvre d'art sont en cours de création. Cela peut prendre quelques instants.</p>
        </div>
      );
    }

    if (step === 3) {
      
      return (
        <div className="space-y-10 py-10">
          <h2 className="text-4xl font-bold text-center text-indigo-900">
            Votre Révélation Céleste, {answers.name || 'Cher Voyageur'}
          </h2>
          <div className="flex flex-col lg:flex-row gap-8 bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 mx-auto">
            
            <div className="lg:w-2/3 space-y-6 text-left">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-indigo-900 mb-4">Votre Voyage Astral</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{splitText.firstHalf}</p>
                {!isDigitalUnlocked && splitText.secondHalf && (
                  <div className="mt-6 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-lg shadow-md">
                    <p className="text-indigo-800 font-semibold">
                      Débloquez la suite de votre voyage astral et choisissez votre produit en cliquant sur le bouton ci-contre.
                    </p>
                  </div>
                )}
                {isDigitalUnlocked && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{splitText.secondHalf}</p>
                )}
              </div>
            </div>
            
            <div className="lg:w-1/3 space-y-6 text-center">
              <h3 className="text-2xl font-bold text-indigo-900">Votre Œuvre d'Art Unique</h3>
              
              <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg shadow-xl overflow-hidden border border-gray-300 mx-auto">
                <img
                    src={result.imageUrl}
                    alt="Design personnalisé"
                    className="w-full h-full object-contain p-4"
                />
              </div>

              <p className="text-gray-600 italic text-sm">
                Cette œuvre d'art capture l'essence de votre profil astral.
              </p>
              
              <button
                onClick={handleProductAction}
                disabled={!result.imageUrl}
                className={`w-full py-4 bg-indigo-600 text-white text-xl font-bold rounded-lg shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    <div className="font-sans p-4 w-full">
      <div className="w-full max-w-6xl p-8 md:p-12 bg-white rounded-3xl shadow-2xl border border-gray-200 mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="bg-gray-50 p-4 w-full">
      <Quiz />
    </div>
  );
}