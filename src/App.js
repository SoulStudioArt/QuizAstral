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
  // MODIFICATION 1 : Le state `result` gère maintenant la description de l'image
  const [result, setResult] = useState({ text: '', imageUrl: '', imageDescription: '' });
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
    // ... (cette fonction ne change pas)
  };

  const handlePreviousQuestion = () => {
    // ... (cette fonction ne change pas)
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
            fetch('/api/generate-image', { // On appelle notre API mise à jour
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dataToSend)
            })
          ]);
          
          if (!textResponse.ok || !imageAndDescResponse.ok) {
              throw new Error("Une erreur est survenue lors de la communication avec nos serveurs. Veuillez réessayer.");
          }

          const textData = await textResponse.json();
          // MODIFICATION 2 : On récupère l'image ET la description de l'image
          const imageData = await imageAndDescResponse.json();
          
          setResult({
              text: textData.text, // Le texte de la Révélation Céleste
              imageUrl: imageData.imageUrl,
              imageDescription: imageData.imageDescription // Le nouveau texte qui décrit l'image
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

    // MODIFICATION 3 : On ajoute la nouvelle description à l'URL de redirection
    const productUrl = `${SHOPIFY_URL}/products/${SHOPIFY_PRODUCT_HANDLE}`;
    const params = new URLSearchParams({
      image_url: result.imageUrl,
      description: result.imageDescription
    });
    
    const lienFinal = `${productUrl}?${params.toString()}`;
    window.top.location.href = lienFinal;
  };

  // ... (toute la partie `renderContent` et le reste du composant restent les mêmes)
};

// ... (le reste de votre fichier reste le même)