'use client';

import { useState, useEffect, useRef } from 'react';

interface TypingGameProps {
  onComplete: () => void;
}

interface FallingLetter {
  id: number;
  letter: string;
  x: number;
  y: number;
  speed: number;
}

export default function TypingGame({ onComplete }: TypingGameProps) {
  const [letters, setLetters] = useState<FallingLetter[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(true);
  const [difficulty, setDifficulty] = useState(1);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const letterIdRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  const GAME_HEIGHT = 600; // Visible box height
  const FALL_DISTANCE = 2400; // Total fall distance (4x)

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(10);
    setLetters([]);
    setDifficulty(1);
  };

  // Handle key press
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (LETTERS.includes(key)) {
        // Find the lowest letter that matches
        const matchingLetters = letters
          .filter(l => l.letter === key)
          .sort((a, b) => b.y - a.y);

        if (matchingLetters.length > 0) {
          const targetLetter = matchingLetters[0];
          setLetters(prev => prev.filter(l => l.id !== targetLetter.id));
          setScore(prev => prev + 10);
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [gameStarted, gameOver, letters]);

  // Spawn letters
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const baseInterval = 800;
    const interval = Math.max(300, baseInterval - (difficulty - 1) * 100);

    const spawnInterval = setInterval(() => {
      const newLetter: FallingLetter = {
        id: letterIdRef.current++,
        letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
        x: Math.random() * 90 + 5,
        y: -100, // Start 100% above the visible box
        speed: 0.8 + (difficulty - 1) * 0.2,
      };
      setLetters(prev => [...prev, newLetter]);
    }, interval);

    return () => clearInterval(spawnInterval);
  }, [gameStarted, gameOver, difficulty]);

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver, onComplete]);

  // Increase difficulty over time
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const difficultyInterval = setInterval(() => {
      setDifficulty(prev => Math.min(prev + 0.5, 5));
    }, 5000);

    return () => clearInterval(difficultyInterval);
  }, [gameStarted, gameOver]);

  // Update letter positions
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const updatePositions = () => {
      setLetters(prev => {
        const updated = prev.map(letter => ({
          ...letter,
          y: letter.y + letter.speed,
        }));

        // Check if any letter reached the bottom (100% of visible box)
        const hitBottom = updated.some(letter => letter.y >= 95);
        if (hitBottom) {
          setGameOver(true);
          return [];
        }

        return updated;
      });

      animationFrameRef.current = requestAnimationFrame(updatePositions);
    };

    animationFrameRef.current = requestAnimationFrame(updatePositions);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 pt-8">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-blue-700">
            <p className="text-blue-400 font-bold text-xl">Score: {score}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-blue-700">
            <p className="text-cyan-400 font-bold text-xl">Time: {timeLeft}s</p>
          </div>
        </div>

        <div
          ref={gameAreaRef}
          className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl border-2 border-blue-700 overflow-visible"
          style={{ height: `${GAME_HEIGHT}px` }}
        >
          {letters.map(letter => (
            <div
              key={letter.id}
              className="absolute text-4xl font-bold text-blue-400 transition-all"
              style={{
                left: `${letter.x}%`,
                top: `${letter.y}%`,
                textShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
              }}
            >
              {letter.letter}
            </div>
          ))}

          {gameOver && timeLeft === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-fade-in">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-green-400 mb-4">Victory!</h2>
                <p className="text-xl text-gray-300 mb-2">You survived!</p>
                <p className="text-lg text-blue-400">Final Score: {score}</p>
                <p className="text-sm text-gray-400 mt-4">Redirecting to site...</p>
              </div>
            </div>
          )}

          {gameOver && timeLeft > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-fade-in">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-red-400 mb-4">Game Over!</h2>
                <p className="text-xl text-gray-300 mb-6">A letter reached the bottom</p>
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              Type the letters to destroy them
            </p>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
