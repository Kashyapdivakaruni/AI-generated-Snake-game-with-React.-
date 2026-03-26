/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal, Cpu, Radio } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Moving Up
const GAME_SPEED = 100;

// Dummy AI Music Tracks (Using reliable public domain/demo tracks)
const TRACKS = [
  {
    id: 1,
    title: "SEQ_01: NEURAL_DRIFT",
    artist: "SYS.AUDIO_GEN",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "SEQ_02: DATA_CORRUPTION",
    artist: "SYS.AUDIO_GEN",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "SEQ_03: OVERRIDE",
    artist: "SYS.AUDIO_GEN",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // --- Music State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for game loop to avoid dependency issues in setInterval
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);
  const isPausedRef = useRef(isPaused);
  const gameStartedRef = useRef(gameStarted);

  // Sync refs
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);

  // --- Audio Handling ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("AUDIO_STREAM_ERROR:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTrackEnd = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);

  // --- Game Logic ---
  const generateFood = useCallback(() => {
    let newFood;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      isOccupied = snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setFood(generateFood());
    setGameStarted(true);
    setIsPaused(false);
    if (!isPlaying) setIsPlaying(true); // Auto-start music on game start
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys and space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === " " && gameStartedRef.current && !gameOverRef.current) {
        setIsPaused(p => !p);
        return;
      }

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const moveSnake = () => {
      if (gameOverRef.current || isPausedRef.current || !gameStartedRef.current) return;

      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;

      head.x += dir.x;
      head.y += dir.y;

      // Wall Collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        handleGameOver();
        return;
      }

      // Self Collision
      if (currentSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        handleGameOver();
        return;
      }

      currentSnake.unshift(head);

      // Food Collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore(s => {
          const newScore = s + 1;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood());
      } else {
        currentSnake.pop();
      }

      setSnake(currentSnake);
    };

    const handleGameOver = () => {
      setGameOver(true);
      setGameStarted(false);
    };

    const gameInterval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(gameInterval);
  }, [generateFood, highScore]);

  // --- Rendering ---
  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = snake[0].x === x && snake[0].y === y;
        const isSnakeBody = snake.some((segment, idx) => idx !== 0 && segment.x === x && segment.y === y);
        const isFood = food.x === x && food.y === y;

        let cellClass = "w-full h-full border border-[#002222] ";
        if (isSnakeHead) cellClass += "bg-white z-10 relative";
        else if (isSnakeBody) cellClass += "bg-cyan-pure opacity-80";
        else if (isFood) cellClass += "bg-magenta-pure animate-pulse";
        else cellClass += "bg-black";

        grid.push(<div key={`${x}-${y}`} className={cellClass} />);
      }
    }
    return grid;
  };

  return (
    <div className="min-h-screen bg-black text-cyan-pure flex flex-col font-sans overflow-hidden crt-screen relative selection:bg-magenta-pure selection:text-black">
      
      {/* Glitch / CRT Overlays */}
      <div className="static-bg"></div>
      <div className="scanline"></div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].url}
        onEnded={handleTrackEnd}
      />

      {/* Header */}
      <header className="w-full p-4 flex items-center justify-between border-b-4 border-magenta-pure bg-black z-20">
        <div className="flex items-center gap-4">
          <Terminal className="w-8 h-8 text-magenta-pure" />
          <h1 className="text-4xl font-black tracking-widest uppercase glitch" data-text="SYS.SNAKE_PROTOCOL">
            SYS.SNAKE_PROTOCOL
          </h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-sm text-magenta-pure uppercase tracking-widest">DATA_YIELD</span>
            <span className="text-3xl font-bold text-cyan-pure">{score.toString().padStart(4, '0')}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm text-magenta-pure uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-4 h-4" /> PEAK_YIELD
            </span>
            <span className="text-3xl font-bold text-cyan-pure">{highScore.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        
        {/* Game Container */}
        <div className="relative w-full max-w-2xl aspect-square border-4 border-cyan-pure bg-black p-1 shadow-[10px_10px_0px_#FF00FF]">
          
          {/* Grid */}
          <div 
            className="w-full h-full grid bg-black overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {renderGrid()}
          </div>

          {/* Overlays */}
          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 border-4 border-magenta-pure m-4">
              <Terminal className="w-24 h-24 text-cyan-pure mb-6" />
              <button 
                onClick={resetGame}
                className="px-8 py-4 bg-cyan-pure text-black font-bold text-3xl uppercase tracking-widest hover:bg-magenta-pure hover:text-white transition-none border-4 border-black"
              >
                EXECUTE_SEQUENCE
              </button>
              <p className="mt-8 text-magenta-pure text-xl uppercase tracking-widest animate-pulse">AWAITING_INPUT: [W,A,S,D]</p>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 border-4 border-cyan-pure m-4">
              <h2 className="text-6xl font-black uppercase mb-4 text-magenta-pure glitch" data-text="CRITICAL_FAILURE">CRITICAL_FAILURE</h2>
              <p className="text-2xl text-cyan-pure mb-8 uppercase tracking-widest">FINAL_YIELD: <span className="text-white">{score.toString().padStart(4, '0')}</span></p>
              <button 
                onClick={resetGame}
                className="px-8 py-4 bg-magenta-pure text-black font-bold text-3xl uppercase tracking-widest hover:bg-cyan-pure hover:text-black transition-none border-4 border-black"
              >
                REBOOT_SYSTEM
              </button>
            </div>
          )}

          {isPaused && gameStarted && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <h2 className="text-6xl font-black uppercase tracking-widest text-cyan-pure bg-magenta-pure text-black px-4 py-2">SYSTEM_HALT</h2>
            </div>
          )}
        </div>
      </main>

      {/* Music Player Footer */}
      <footer className="w-full bg-black border-t-4 border-cyan-pure p-4 z-20 shadow-[0_-10px_0px_#FF00FF]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Track Info */}
          <div className="flex items-center gap-4 w-full md:w-1/3">
            <div className="w-16 h-16 bg-magenta-pure flex items-center justify-center border-2 border-cyan-pure relative overflow-hidden">
              <Radio className={`w-8 h-8 text-black ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xl font-bold text-cyan-pure truncate uppercase tracking-widest">{TRACKS[currentTrackIndex].title}</span>
              <span className="text-sm text-magenta-pure truncate uppercase tracking-widest">{TRACKS[currentTrackIndex].artist}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8 w-full md:w-1/3">
            <button onClick={prevTrack} className="text-magenta-pure hover:text-white transition-none">
              <SkipBack className="w-10 h-10" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-16 h-16 bg-cyan-pure border-4 border-magenta-pure flex items-center justify-center text-black hover:bg-magenta-pure hover:border-cyan-pure hover:text-white transition-none"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-2" />}
            </button>
            <button onClick={nextTrack} className="text-magenta-pure hover:text-white transition-none">
              <SkipForward className="w-10 h-10" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-end gap-4 w-full md:w-1/3">
            <button onClick={() => setIsMuted(!isMuted)} className="text-cyan-pure hover:text-magenta-pure transition-none">
              {isMuted || volume === 0 ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-32 h-4 bg-black border-2 border-magenta-pure appearance-none cursor-pointer accent-cyan-pure"
            />
          </div>

        </div>
      </footer>
    </div>
  );
}
