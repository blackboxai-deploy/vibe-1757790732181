"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Game configuration
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150; // milliseconds
const SPEED_INCREASE = 10; // decrease interval by this amount per level
const MIN_SPEED = 50;

// Direction vectors
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

type Direction = keyof typeof DIRECTIONS;
type GameState = "menu" | "playing" | "paused" | "gameOver";
type Position = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastMoveTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>("menu");
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [level, setLevel] = useState(1);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log("Audio not supported");
      }
      
      // Load high score from localStorage
      const savedHighScore = localStorage.getItem("snakeHighScore");
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore));
      }
    }
  }, []);

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = "square") => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      // Silent fail for audio errors
    }
  }, []);

  // Generate random food position
  const generateFood = useCallback((snakePositions: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakePositions.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Check collision with walls or self
  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // Self collision
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Move snake
  const moveSnake = useCallback(() => {
    if (gameState !== "playing") return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      const dir = DIRECTIONS[direction];
      
      head.x += dir.x;
      head.y += dir.y;

      // Check collisions
      if (checkCollision(head, newSnake)) {
        setGameState("gameOver");
        playSound(150, 0.5, "sawtooth");
        
        // Update high score
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("snakeHighScore", score.toString());
        }
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        const newScore = score + 1;
        setScore(newScore);
        setFood(generateFood(newSnake));
        playSound(800, 0.1);
        
        // Increase speed and level
        const newLevel = Math.floor(newScore / 5) + 1;
        if (newLevel !== level) {
          setLevel(newLevel);
          const newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREASE);
          setSpeed(newSpeed);
        }
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameState, direction, food, score, level, highScore, checkCollision, generateFood, playSound]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState === "playing" && currentTime - lastMoveTimeRef.current >= speed) {
      moveSnake();
      lastMoveTimeRef.current = currentTime;
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, speed, moveSnake]);

  // Start game loop
  useEffect(() => {
    if (gameState === "playing") {
      lastMoveTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? "#10B981" : "#34D399"; // Head is darker green
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
      
      // Add eyes to head
      if (index === 0) {
        ctx.fillStyle = "#000";
        const eyeSize = 3;
        const eyeOffset = 6;
        
        switch (direction) {
          case "RIGHT":
            ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 4, segment.y * CELL_SIZE + 4, eyeSize, eyeSize);
            ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 4, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
            break;
          case "LEFT":
            ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 4, eyeSize, eyeSize);
            ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
            break;
          case "UP":
            ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 4, eyeSize, eyeSize);
            ctx.fillRect(segment.x * CELL_SIZE + 12, segment.y * CELL_SIZE + 4, eyeSize, eyeSize);
            break;
          case "DOWN":
            ctx.fillRect(segment.x * CELL_SIZE + 4, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
            ctx.fillRect(segment.x * CELL_SIZE + 12, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
            break;
        }
      }
    });

    // Draw food
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(
      food.x * CELL_SIZE + 2,
      food.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
    
    // Add shine to food
    ctx.fillStyle = "#FCA5A5";
    ctx.fillRect(
      food.x * CELL_SIZE + 4,
      food.y * CELL_SIZE + 4,
      CELL_SIZE / 2,
      CELL_SIZE / 2
    );

  }, [snake, food, direction]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      
      if (gameState === "menu" && (e.code === "Space" || e.code === "Enter")) {
        startGame();
        return;
      }
      
      if (gameState === "gameOver" && e.code === "KeyR") {
        resetGame();
        return;
      }
      
      if (gameState === "playing" || gameState === "paused") {
        switch (e.code) {
          case "Space":
            togglePause();
            break;
          case "KeyR":
            resetGame();
            break;
          case "ArrowUp":
          case "KeyW":
            if (direction !== "DOWN") setDirection("UP");
            break;
          case "ArrowDown":
          case "KeyS":
            if (direction !== "UP") setDirection("DOWN");
            break;
          case "ArrowLeft":
          case "KeyA":
            if (direction !== "RIGHT") setDirection("LEFT");
            break;
          case "ArrowRight":
          case "KeyD":
            if (direction !== "LEFT") setDirection("RIGHT");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, direction]);

  const startGame = () => {
    setGameState("playing");
    playSound(440, 0.1);
  };

  const togglePause = () => {
    if (gameState === "playing") {
      setGameState("paused");
    } else if (gameState === "paused") {
      setGameState("playing");
    }
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    setFood({ x: 15, y: 15 });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setLevel(1);
    setGameState("playing");
    playSound(660, 0.1);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Game Stats */}
      <div className="flex justify-between w-full max-w-md text-center">
        <div className="bg-gray-700 rounded-lg px-4 py-2">
          <div className="text-green-400 text-lg font-bold">{score}</div>
          <div className="text-gray-300 text-xs">SCORE</div>
        </div>
        <div className="bg-gray-700 rounded-lg px-4 py-2">
          <div className="text-blue-400 text-lg font-bold">{highScore}</div>
          <div className="text-gray-300 text-xs">HIGH SCORE</div>
        </div>
        <div className="bg-gray-700 rounded-lg px-4 py-2">
          <div className="text-purple-400 text-lg font-bold">{level}</div>
          <div className="text-gray-300 text-xs">LEVEL</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-600 rounded-lg bg-gray-900"
        />
        
        {/* Game State Overlays */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-green-400 mb-4">Ready to Play?</h2>
              <p className="text-gray-300 mb-6">Press SPACE or ENTER to start</p>
              <div className="animate-pulse text-green-400">🎮</div>
            </div>
          </div>
        )}
        
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">⏸️ PAUSED</h2>
              <p className="text-gray-300">Press SPACE to resume</p>
            </div>
          </div>
        )}
        
        {gameState === "gameOver" && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-400 mb-4">💀 GAME OVER</h2>
              <p className="text-gray-300 mb-2">Final Score: <span className="text-green-400 font-bold">{score}</span></p>
              {score === highScore && score > 0 && (
                <p className="text-yellow-400 mb-4">🏆 NEW HIGH SCORE!</p>
              )}
              <p className="text-gray-400 mb-6">Press R to play again</p>
              <div className="animate-bounce text-red-400">💥</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      <div className="flex space-x-4">
        {gameState === "menu" && (
          <button
            onClick={startGame}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Start Game
          </button>
        )}
        
        {(gameState === "playing" || gameState === "paused") && (
          <>
            <button
              onClick={togglePause}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {gameState === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={resetGame}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Restart
            </button>
          </>
        )}
        
        {gameState === "gameOver" && (
          <button
            onClick={resetGame}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Play Again
          </button>
        )}
      </div>
      
      {/* Speed Indicator */}
      <div className="text-center text-gray-400 text-sm">
        <div>Speed: {Math.round((1000 / speed) * 10) / 10} moves/sec</div>
        <div className="w-48 bg-gray-700 rounded-full h-2 mt-2 mx-auto">
          <div
            className="bg-gradient-to-r from-green-400 to-red-400 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, ((INITIAL_SPEED - speed) / (INITIAL_SPEED - MIN_SPEED)) * 100)}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}