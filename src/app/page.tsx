"use client";

import { useState, useEffect } from "react";
import SnakeGame from "@/components/SnakeGame";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading Snake Game...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Game Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-green-400 mb-4 tracking-wide">
            🐍 SNAKE GAME
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Control with Arrow Keys or WASD
          </p>
          <p className="text-gray-400 text-sm">
            Eat food to grow longer • Avoid hitting walls or yourself • Speed increases with score
          </p>
        </div>

        {/* Game Container */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6">
          <SnakeGame />
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-green-400 font-semibold">↑ W</div>
              <div>Move Up</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-green-400 font-semibold">↓ S</div>
              <div>Move Down</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-green-400 font-semibold">← A</div>
              <div>Move Left</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-green-400 font-semibold">→ D</div>
              <div>Move Right</div>
            </div>
          </div>
          <div className="mt-4">
            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">SPACE</kbd> - Pause/Resume
            <span className="mx-4">•</span>
            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">R</kbd> - Restart Game
          </div>
        </div>
      </div>
    </main>
  );
}