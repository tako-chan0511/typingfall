<!-- src/components/TypingGame.vue -->
<template>
  <div class="game-container">
    <header>
      <div class="stats">SCORE: <span>{{ score }}</span></div>
      <div class="stats">LEVEL: <span>{{ level }}</span></div>
      <div class="stats" v-if="difficulty !== 'FingerDrill'">LIVES: <span>{{ lives }}</span></div>
    </header>
    <div class="game-area" ref="gameAreaRef">
      <div 
        v-for="word in words" 
        :key="word.id" 
        class="word" 
        :class="{ active: activeWord?.id === word.id }"
        :style="{ left: word.x + 'px', top: word.y + 'px', color: word.color, fontSize: gameSettings[difficulty].fontSize + 'px' }"
      >
        <div class="display-text-wrapper">
          <span
            v-for="(char, index) in word.display.split('')"
            :key="index"
            :class="{ typed: word.typed.length > index }"
            class="char-display"
          >
            {{ char }}
          </span>
        </div>
        <div v-if="difficulty === 'FingerDrill'" class="fingering-guide">
          <span v-for="(f, index) in word.fingering" :key="index" :class="['finger-' + f.finger.charAt(0).toLowerCase(), { typed: word.typed.length > index }]">
            {{ f.finger }}
          </span>
        </div>
      </div>
      
      <div v-if="gameState !== 'playing'" class="modal">
        <div class="modal-content">
          <div v-if="gameState === 'start'">
              <h1>TYPING FALL</h1>
              <p>指のホームポジションを意識して<br>正確なタイピングをマスターしよう！</p>
              
              <div class="settings-container">
                <div class="setting-group">
                  <label>モード選択</label>
                  <div class="difficulty-selector">
                    <button @click="setDifficulty('FingerDrill')" :class="{ active: difficulty === 'FingerDrill' }">指練習</button>
                    <button @click="setDifficulty('Practice')" :class="{ active: difficulty === 'Practice' }">PRACTICE</button>
                    <button @click="setDifficulty('Normal')" :class="{ active: difficulty === 'Normal' }">NORMAL</button>
                    <button @click="setDifficulty('Hard')" :class="{ active: difficulty === 'Hard' }">HARD</button>
                  </div>
                </div>
                <div class="setting-group" v-if="difficulty !== 'FingerDrill'">
                  <label for="speed-slider">初期速度: {{ initialSpeed.toFixed(2) }}</label>
                  <input type="range" id="speed-slider" min="0.1" max="2.5" step="0.01" v-model.number="initialSpeed" class="slider">
                </div>
                <div v-if="difficulty === 'Practice'" class="setting-group">
                  <label for="word-count-slider">単語の数: {{ practiceWordCount }}</label>
                  <input type="range" id="word-count-slider" min="1" max="10" step="1" v-model.number="practiceWordCount" class="slider">
                </div>
              </div>
              
              <button @click="startGame" class="start-button">START GAME</button>
          </div>
          <div v-if="gameState === 'gameover'">
              <h1>GAME OVER</h1>
              <h2>FINAL SCORE: {{ score }}</h2>
              <button @click="startGame" class="start-button">RESTART</button>
          </div>
        </div>
      </div>

        <div v-if="difficulty === 'FingerDrill' && gameState === 'playing'" class="drill-navigation">
        <button @click="previousWord" class="nav-button prev-button">
          (Shift+Space) 前の単語へ
        </button>
        <button @click="nextWord" class="nav-button next-button">
          次の単語へ (Space)
        </button>
      </div>

    </div>
    
    <div class="input-display">
      <span>{{ currentInput }}</span>
      <span class="input-cursor"></span>
    </div>

    <!-- ★★★ 修正点: エラーの原因となっていた @input="handleInput" を削除 ★★★ -->
    <input
      ref="hiddenInputRef"
      type="text"
      class="hidden-input"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { englishWordList } from '../words_en';
import { japaneseWordList } from '../words_ja';
import { practiceWordList } from '../practiceWords';
import { fingerMap } from '../fingering';
import type { Word, GameState, Difficulty, Language, Fingering } from '../types';

const score = ref(0);
const level = ref(1);
const lives = ref(5);
const words = ref<Word[]>([]);
const gameState = ref<GameState>('start');
const difficulty = ref<Difficulty>('FingerDrill');
const initialSpeed = ref(0.8);
const practiceWordCount = ref(5);
let currentBaseSpeed = 1.0;
let wordIdCounter = 0;
let currentPracticeWordIndex = 0;

const currentInput = ref(''); 

const activeWord = computed(() => words.value.find(w => w.typed.length > 0 && w.typed !== w.target));

// --- Template Refs ---
const gameAreaRef = ref<HTMLElement | null>(null);
const hiddenInputRef = ref<HTMLInputElement | null>(null);
let animationFrameId: number;

const gameSettings = {
  FingerDrill: { spawnRate: 9999, fontSize: 48 },
  Practice: { spawnRate: 150, fontSize: 32 },
  Normal: { spawnRate: 120, fontSize: 32 },
  Hard: { spawnRate: 90, fontSize: 36 }
};

const vibrantColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed', '#be2edd'];

const initGame = () => {
  score.value = 0;
  level.value = 1;
  lives.value = 5;
  words.value = [];
  gameState.value = 'playing';
  currentBaseSpeed = initialSpeed.value;
  wordIdCounter = 0;
  currentInput.value = '';

  if (difficulty.value === 'FingerDrill') {
    currentPracticeWordIndex = 0;
    spawnWord();
  } else if (difficulty.value === 'Practice') {
    for (let i = 0; i < practiceWordCount.value; i++) spawnWord();
  }
};

const startGame = () => {
  initGame();
  nextTick(focusInput);
  gameLoop();
};

const setDifficulty = (level: Difficulty) => { difficulty.value = level; };

const getFinger = (char: string): string => fingerMap[char.toLowerCase()] || '??';

const spawnWord = () => {
  if (!gameAreaRef.value) return;

  let text: string;
  if (difficulty.value === 'FingerDrill') {
    text = practiceWordList[currentPracticeWordIndex];
  } else {
    text = englishWordList[Math.floor(Math.random() * englishWordList.length)];
  }

  const { fontSize } = gameSettings[difficulty.value];
  const textWidth = text.length * fontSize * 0.6;
  const newWord: Word = {
    id: wordIdCounter++,
    display: text,
    target: text,
    typed: '',
    x: Math.random() * Math.max(0, gameAreaRef.value.clientWidth - textWidth - 40) + 20,
    y: difficulty.value === 'FingerDrill' ? gameAreaRef.value.clientHeight / 2 - 100 : -fontSize,
    speed: difficulty.value === 'FingerDrill' ? 0 : currentBaseSpeed + Math.random() * 0.5,
    color: vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
    fingering: text.split('').map(char => ({ char, finger: getFinger(char) }))
  };
  words.value.push(newWord);
};

let frameCount = 0;
const gameLoop = () => {
  if (gameState.value !== 'playing') return;

  if (difficulty.value !== 'FingerDrill') {
    if (difficulty.value === 'Practice') {
      if (words.value.length < practiceWordCount.value) spawnWord();
    } else {
      frameCount++;
      if (frameCount % gameSettings[difficulty.value].spawnRate === 0) spawnWord();
    }
  }

  for (let i = words.value.length - 1; i >= 0; i--) {
    const word = words.value[i];
    word.y += word.speed;

    if (gameAreaRef.value && word.y > gameAreaRef.value.clientHeight) {
      words.value.splice(i, 1);
      if (difficulty.value !== 'FingerDrill') {
        lives.value--;
        if (lives.value <= 0) gameOver();
      }
    }
  }

  animationFrameId = requestAnimationFrame(gameLoop);
};

const gameOver = () => {
  gameState.value = 'gameover';
  cancelAnimationFrame(animationFrameId);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameState.value !== 'playing' || e.metaKey || e.ctrlKey || e.altKey) return;
  
  if (e.key === ' ' && difficulty.value === 'FingerDrill') {
    e.preventDefault();
    if(e.shiftKey){
      previousWord();
    } else {
      nextWord();
    }
    return;
  }
  
  e.preventDefault();

  if (e.key === 'Backspace') {
    currentInput.value = currentInput.value.slice(0, -1);
    checkInput();
    return;
  }
  
  if (e.key.length === 1) {
    currentInput.value += e.key.toLowerCase();
    checkInput();
  }
};

const checkInput = () => {
  const targetWord = words.value[0]; 
  if (!targetWord) return;

  if (targetWord.target.startsWith(currentInput.value)) {
    targetWord.typed = currentInput.value;
    if (targetWord.target === currentInput.value) {
      wordCompleted(targetWord);
    }
  } else {
    currentInput.value = currentInput.value.slice(0, -1); 
  }
};

const wordCompleted = (word: Word) => {
  score.value += word.target.length * 10;
  
  if (difficulty.value === 'FingerDrill') {
    words.value[0].typed = ''; 
  } else {
    words.value = words.value.filter(w => w.id !== word.id);
  }
  
  currentInput.value = '';
  
  if (score.value > level.value * 500 && difficulty.value !== 'Practice' && difficulty.value !== 'FingerDrill') {
    level.value++;
    currentBaseSpeed += 0.2;
  }
};

const nextWord = () => {
  if (difficulty.value !== 'FingerDrill') return;
  words.value = [];
  currentInput.value = '';
  currentPracticeWordIndex = (currentPracticeWordIndex + 1) % practiceWordList.length;
  spawnWord();
  focusInput();
}

const previousWord = () => {
  if (difficulty.value !== 'FingerDrill') return;
  words.value = [];
  currentInput.value = '';
  currentPracticeWordIndex--;
  if (currentPracticeWordIndex < 0) {
    currentPracticeWordIndex = practiceWordList.length - 1;
  }
  spawnWord();
  focusInput();
}

const focusInput = () => {
  if(hiddenInputRef.value) hiddenInputRef.value.focus({ preventScroll: true });
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  cancelAnimationFrame(animationFrameId);
});

</script>


<style scoped>
/* ★★★ このラッパーが画面全体を占有し、中央配置の基準となる ★★★ */
.game-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #0d1117;
}
.game-container {
    width: 100%;
    max-width: 800px;
    height: 100%; /* JSで動的に設定される */
    display: flex;
    flex-direction: column;
    border: 2px solid #30363d;
    border-radius: 12px;
    background-color: #010409;
    box-shadow: 0 0 30px rgba(0, 128, 255, 0.2);
    position: relative;
    overflow: hidden;
    transition: height 0.15s ease-out;
}
header {
    display: flex;
    justify-content: space-between;
    padding: 15px 25px;
    background-color: #161b22;
    border-bottom: 2px solid #30363d;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    flex-shrink: 0;
}
.stats {
    font-size: 1.4em;
    letter-spacing: 2px;
}
.stats span {
    color: #58a6ff;
    font-weight: bold;
}
.game-area {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    min-height: 0;
}
.word {
    position: absolute;
    font-family: 'Share Tech Mono', monospace;
    font-weight: bold;
    text-shadow: 0 0 10px currentColor, 0 0 5px rgba(255,255,255,0.7);
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 8px;
}
.word.active {
  background-color: rgba(88, 166, 255, 0.2);
  border-radius: 6px;
  transform: scale(1.1);
  transition: transform 0.1s ease-in-out, background-color 0.1s ease-in-out;
}
.display-text {}
.reading-text {
  font-size: 0.6em;
  opacity: 0.8;
  margin-top: 4px;
  background-color: rgba(0,0,0,0.5);
  padding: 2px 4px;
  border-radius: 4px;
  letter-spacing: 1px;
}
.typed {
  color: #a5d6ff;
  font-weight: bold;
}
.input-display {
    padding: 15px;
    background-color: rgba(22, 27, 34, 0.9);
    border-top: 2px solid #30363d;
    text-align: center;
    font-size: 2em;
    color: #58a6ff;
    letter-spacing: 4px;
    min-height: 40px;
    flex-shrink: 0;
}
.hidden-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.input-cursor {
    display: inline-block;
    width: 12px;
    height: 28px;
    background-color: #58a6ff;
    animation: blink 1s step-end infinite;
    vertical-align: bottom;
    margin-left: 5px;
}
@keyframes blink {
    from, to { background-color: transparent; }
    50% { background-color: #58a6ff; }
}
.modal {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(1, 4, 9, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
}
.modal-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    width: 100%;
    max-height: 90%;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
}
.modal h1 {
    font-size: 4em;
    color: #58a6ff;
    text-shadow: 0 0 15px #58a6ff;
    margin-bottom: 20px;
}
.modal h2 {
    font-size: 2em;
    margin: 20px 0;
    color: #c9d1d9;
}
.modal p {
    font-size: 1.2em;
    color: #8b949e;
    max-width: 90%;
    line-height: 1.6;
}
.start-button {
    font-family: 'Share Tech Mono', monospace;
    font-size: 1.5em;
    padding: 15px 30px;
    margin-top: 30px;
    border: 2px solid #58a6ff;
    background-color: transparent;
    color: #58a6ff;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 2px;
    border-radius: 6px;
    flex-shrink: 0;
}
.start-button:hover {
    background-color: #58a6ff;
    color: #010409;
    box-shadow: 0 0 20px #58a6ff;
}
.settings-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 30px;
    align-items: center;
    width: 100%;
}
.setting-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
}
.setting-group label {
    font-size: 1.2em;
    color: #8b949e;
}
.difficulty-selector {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
}
.difficulty-selector button {
    font-family: 'Share Tech Mono', monospace;
    font-size: 1.1em;
    padding: 10px 15px;
    margin: 0;
    border: 2px solid #8b949e;
    background-color: transparent;
    color: #8b949e;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.3s ease;
}
.difficulty-selector button.active {
    border-color: #58a6ff;
    color: #58a6ff;
    box-shadow: 0 0 10px #58a6ff;
}
.slider {
    -webkit-appearance: none;
    width: 90%;
    max-width: 280px;
    height: 8px;
    background: #30363d;
    outline: none;
    border-radius: 4px;
    opacity: 0.7;
    transition: opacity .2s;
}
.slider:hover {
    opacity: 1;
}
.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: #58a6ff;
    cursor: pointer;
    border-radius: 50%;
    border: 2px solid #161b22;
}
.slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background: #58a6ff;
    cursor: pointer;
    border-radius: 50%;
    border: 2px solid #161b22;
}
.display-text-wrapper {
  display: flex;
}
.char-display {
  transition: color 0.2s;
}
.char-display.typed {
  color: #58a6ff; /* タイプ済みの文字色 */
}
.fingering-guide {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  font-size: 0.5em;
  opacity: 0.9;
}
.fingering-guide span {
  display: inline-block;
  width: 24px;
  text-align: center;
  border-radius: 4px;
  padding: 2px 0;
  color: white;
  font-weight: bold;
}
.fingering-guide span.typed {
  opacity: 0.4;
}
/* ★★★ 左手と右手の色分け ★★★ */
.finger-l { background-color: #3b82f6; } /* Blue */
.finger-r { background-color: #f97316; } /* Orange */
/* 各指ごとの色分け */
.finger-l5 { background-color: #E91E63; }
.finger-l4 { background-color: #2196F3; }
.finger-l3 { background-color: #4CAF50; }
.finger-l2 { background-color: #FFC107; color: #333;}
.finger-r2 { background-color: #FF9800; }
.finger-r3 { background-color: #4CAF50; }
.finger-r4 { background-color: #2196F3; }
.finger-r5 { background-color: #E91E63; }
.next-word-button {
    position: absolute;
    bottom: 80px;
    right: 20px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 1.2em;
    padding: 10px 20px;
    border: 2px solid #2ed573;
    background-color: rgba(46, 213, 115, 0.2);
    color: #2ed573;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 6px;
    z-index: 20;
}
.next-word-button:hover {
    background-color: #2ed573;
    color: #010409;
    box-shadow: 0 0 15px #2ed573;
}
.drill-navigation {
  position: absolute;
  bottom: 80px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
}
.nav-button {
    font-family: 'Share Tech Mono', monospace;
    font-size: 1em;
    padding: 8px 16px;
    border: 2px solid #2ed573;
    background-color: rgba(46, 213, 115, 0.2);
    color: #2ed573;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 6px;
    z-index: 20;
}
.nav-button:hover {
    background-color: #2ed573;
    color: #010409;
    box-shadow: 0 0 15px #2ed573;
}
.prev-button {
  border-color: #f97316;
  background-color: rgba(249, 115, 22, 0.2);
  color: #f97316;
}
.prev-button:hover {
  background-color: #f97316;
  box-shadow: 0 0 15px #f97316;
}
</style>
