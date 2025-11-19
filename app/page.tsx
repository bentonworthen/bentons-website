'use client';

import { useState, useEffect } from 'react';
import TypingGame from './components/TypingGame';
import Portfolio from './components/Portfolio';

export default function Home() {
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already completed the game
    const completed = localStorage.getItem('gameCompleted') === 'true';
    setGameCompleted(completed);
    setIsLoading(false);
  }, []);

  const handleGameComplete = () => {
    localStorage.setItem('gameCompleted', 'true');
    setGameCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {!gameCompleted ? (
        <TypingGame onComplete={handleGameComplete} />
      ) : (
        <Portfolio />
      )}
    </>
  );
}
