// src/types.ts

export interface Word {
  id: number;      // 単語を区別するための一意のID
  display: string; // 画面に表示される文字 (例: 'hello' or 'こんにちは')
  target: string;  // ユーザーがタイプするべき文字列 (例: 'hello' or 'konnichiha')
  typed: string;   // ユーザーがタイプ済みの部分
  x: number;
  y: number;
  speed: number;
  color: string;
}

export type GameState = 'start' | 'playing' | 'gameover';
export type Difficulty = 'Practice' | 'Normal' | 'Hard';
export type Language = 'English' | 'Japanese';
