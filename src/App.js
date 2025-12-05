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

const SHOPIFY_PRODUCT_HANDLE = 'mystical-eye-mandala-canvas-art-home-decor-spiritual-wall-art-meditation-decor-gift-for-mindfulness-boho-art-piece';
const SHOPIFY_URL = 'https://soulstudioart.com';

const Quiz = () => {
  const [step, setStep] = useState(0);
  const [quizLength, setQuizLength] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState({ text: '', imageUrl: '', imageDescription: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDigitalUnlocked, setIsDigitalUnlocked] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
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
    if (splitPoint === -1) { splitPoint = midpoint; }
    const firstHalf = result.text.substring(0, splitPoint + 1);
    const secondHalf = result.text.substring(splitPoint + 1);
    return { firstHalf, secondHalf };
  }, [result.text]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prevAnswers) => ({ ...prevAnswers, [name]: value }));
  };

  const handleNextQuestion = () => {
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
          const [textResponse, imageAndDescResponse] = await Promise.all([
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
          
          if (!textResponse.ok || !imageAndDescResponse.ok) {
              throw new Error("Une erreur est survenue lors de la communication avec nos serveurs. Veuillez réessayer.");
          }

          const textData = await textResponse.json();
          const imageData = await imageAndDescResponse.json();
          
          setResult({
              text: textData.text, 
              imageUrl: imageData.imageUrl,
              imageDescription: imageData.imageDescription 
          });
          setError('');

      } catch (e) {
          console.error("Erreur lors de l'appel des Vercel Functions :", e);
          setError(e.message || "Désolé, une erreur est survenue. Veuillez réessayer.");
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

    const productUrl = `${SHOPIFY_URL}/products/${SHOPIFY_PRODUCT_HANDLE}`;
    const params = new URLSearchParams({
      image_url: result.imageUrl,
      description: result.imageDescription
    });
    
    const lienFinal = `${productUrl}?${params.toString()}`;
    window.top.location.href = lienFinal;
  };

  // --- COMPOSANT ZOOM (LIGHTBOX) ---
  const ZoomModal = () => {
    if (!isZoomed) return null;
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4 cursor-zoom-out"
        onClick={() => setIsZoomed(false)}
      >
        <img 
          src={result.imageUrl} 
          alt="Zoom Art" 
          className="max-h-full max-w-full object-contain shadow-2xl rounded-md border border-gray-800"
        />
        <button 
          className="absolute top-5 right-5 text-white text-4xl font-bold focus:outline-none hover:text-indigo-400 transition-colors"
          onClick={() => setIsZoomed(false)}
        >
          &times;
        </button>
      </div>
    );
  };

  const renderContent = () => {
if (step === 0) {
      return (
        <div className="text-center space-y-10 py-12">
          
          {/* --- TITRE ÉPURÉ --- */}
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Univers <span className="text-indigo-400">Céleste</span> 🌟
          </h2>
          
          {/* --- DESCRIPTION FUSION IA --- */}
          <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
            Vivez la fusion entre l'énergie céleste et l'intelligence artificielle. 
            Laissez la technologie interpréter votre signature astrale pour révéler l'image unique de votre essence.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-6 pt-6">
            <button
              onClick={() => { setQuizLength('short'); setStep(1); }}
              className="bg-indigo-600 text-white px-10 py-4 rounded-lg font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105 border border-indigo-500"
            >
              Quiz Rapide (3 Questions)
            </button>
            <button
              onClick={() => { setQuizLength('long'); setStep(1); }}
              className="bg-transparent text-white border-2 border-gray-600 px-10 py-4 rounded-lg font-bold text-lg hover:border-indigo-400 hover:text-indigo-400 transition-all duration-300 transform hover:scale-105"
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
        const inputClasses = "w-full max-w-lg mx-auto px-4 py-3 bg-[#252525] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-500 transition-colors";
        
        if (question.type === 'textarea') {
          return (
            <textarea
              name={question.id}
              value={answers[question.id] || ''}
              onChange={handleChange}
              className={`${inputClasses} h-32 resize-none`}
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
            className={inputClasses}
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
          <h2 className="text-3xl font-bold text-white max-w-4xl mx-auto">
            {currentQuestion.label}
          </h2>
          <div className="w-full max-w-xl mx-auto pt-4">
            {renderInput(currentQuestion)}
          </div>
          {error && <p className="text-red-400 font-bold bg-red-900/20 py-2 rounded">{error}</p>}
          <div className="flex justify-center gap-4 w-full max-w-xl mx-auto pt-6">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-8 py-4 rounded-lg font-bold transition duration-300 border border-gray-700 ${currentQuestionIndex === 0 ? 'bg-transparent text-gray-600 cursor-not-allowed' : 'bg-[#252525] text-white hover:bg-[#333]'}`}
            >
              Précédent
            </button>
            <button
              onClick={isLastQuestion ? handleSubmit : handleNextQuestion}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg hover:bg-indigo-500 transition duration-300"
            >
              {isLastQuestion ? 'Découvrir ma Révélation' : 'Suivant'}
            </button>
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-8 text-center">
          {/* Custom Spinner Blanc/Violet */}
          <div className="w-16 h-16 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin"></div> 
          <h2 className="text-2xl font-bold text-white">Création de votre Révélation...</h2>
          <p className="text-gray-400 text-lg">L'architecte dessine les plans, l'artiste prépare ses pinceaux...<br/>Votre œuvre unique arrive.</p>
        </div>
      );
    }
    
    // --- ÉTAPE 3 : RÉSULTAT DARK MODE ---
    if (step === 3) {
      return (
        <div className="space-y-12 py-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white">
            Votre Œuvre d'Art Astrale, <span className="text-indigo-400">{answers.name || 'Cher Voyageur'}</span>
          </h2>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            
            {/* IMAGE */}
            <div className="w-full lg:w-1/2 relative group cursor-zoom-in" onClick={() => setIsZoomed(true)}>
              <div className="aspect-square bg-black rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-800 relative">
                 <img
                    src={result.imageUrl}
                    alt="Design personnalisé"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600">
                  🔍 Agrandir
                </div>
              </div>
            </div>

            {/* DESCRIPTION & ACTION */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-6 lg:pt-4">
              <h3 className="text-2xl font-bold text-white">L'Essence de votre Design</h3>
              
              <p className="text-gray-400 text-lg leading-relaxed">
                Cette image a été générée exclusivement pour vous, basée sur votre énergie et vos rêves. Elle n'existe nulle part ailleurs dans l'univers.
              </p>

              <div className="p-6 bg-[#1a1a1a] rounded-lg border-l-4 border-indigo-500 shadow-sm italic text-gray-300 leading-relaxed">
                <p className="text-xl font-medium">"{result.imageDescription}"</p>
              </div>
              
              <div className="p-6 bg-[#111] rounded-xl border border-gray-800 shadow-sm mt-4">
                <p className="text-indigo-300 font-semibold mb-4">
                  Transformez cette vision en réalité. Imprimez votre âme sur une toile de qualité musée.
                </p>
                <button
                  onClick={handleProductAction}
                  disabled={!result.imageUrl}
                  className={`w-full py-4 bg-indigo-600 text-white text-xl font-bold rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-300 transform hover:scale-105 hover:bg-indigo-500 ${!result.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Créer mon Produit Personnalisé →
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* TEXTE RÉVÉLATION */}
          <div className="bg-[#111] p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-800 mx-auto max-w-4xl">
            <h3 className="text-2xl font-bold text-indigo-400 mb-6 text-center">Votre Révélation Céleste</h3>
            <div className="space-y-4 text-lg text-gray-300 leading-relaxed text-justify">
                <p className="whitespace-pre-wrap">{splitText.firstHalf}</p>
                <p className="whitespace-pre-wrap">{splitText.secondHalf}</p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col items-center space-y-6 pt-8 pb-4">
             <p className="text-gray-500 italic">Vous aimez ce que vous voyez ?</p>
             <div className="flex flex-col md:flex-row gap-6 items-center">
                <img src={result.imageUrl} alt="Miniature" className="w-24 h-24 rounded-lg shadow-md object-cover border border-gray-700" />
                <button
                  onClick={handleProductAction}
                  className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
                >
                  Commander ma Toile Maintenant
                </button>
             </div>
          </div>

          <ZoomModal />
        </div>
      );
    }
  };

  return (
    // FOND GLOBAL NOIR PROFOND + GRIS FONCÉ
    <div className="font-sans w-full min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      {/* CARTE PRINCIPALE GRIS FONCÉ */}
      <div className="w-full max-w-6xl p-6 md:p-12 bg-[#161616] rounded-3xl shadow-2xl border border-gray-800 mx-auto my-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="bg-[#0a0a0a] w-full min-h-screen">
      <Quiz />
    </div>
  );
}