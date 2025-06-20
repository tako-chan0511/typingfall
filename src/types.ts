// src/types.ts

export interface Word {
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

export type GameState = 'start' | 'playing' | 'gameover';
export type Difficulty = 'Practice' | 'Normal' | 'Hard';