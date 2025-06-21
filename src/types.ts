// src/types.ts

export interface Fingering {
  char: string;
  finger: string;
}

export interface Word {
  id: number;
  display: string;
  target: string;
  typed: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  fingering: Fingering[]; // 運指ガイド用の配列
}

export type GameState = 'start' | 'playing' | 'gameover';
export type Difficulty = 'FingerDrill' | 'Practice' | 'Normal' | 'Hard';
export type Language = 'English' | 'Japanese';
