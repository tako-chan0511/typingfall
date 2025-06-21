<template>
  <div class="game-container" ref="gameContainerRef" @click="focusInput">
    <header>
      <div class="stats">SCORE: <span>{{ score }}</span></div>
      <div class="stats">LEVEL: <span>{{ level }}</span></div>
      <div class="stats">LIVES: <span>{{ lives }}</span></div>
    </header>
    <div class="game-area" ref="gameAreaRef">
      <div 
        v-for="(word, index) in words" 
        :key="index" 
        class="word" 
        :style="{ left: word.x + 'px', top: word.y + 'px', color: word.color, fontSize: gameSettings[difficulty].fontSize + 'px' }"
      >
        {{ word.text }}
      </div>
      
      <div v-if="gameState !== 'playing'" class="modal">
        <div class="modal-content">
          <div v-if="gameState === 'start'">
              <h1>TYPING FALL</h1>
              <p>PRACTICEモードでは速度が上がりません。<br>自分のペースで練習に集中できます。</p>
              
              <div class="settings-container">
                <div class="setting-group">
                  <label>モード選択</label>
                  <div class="difficulty-selector">
                    <button @click="setDifficulty('Practice')" :class="{ active: difficulty === 'Practice' }">PRACTICE</button>
                    <button @click="setDifficulty('Normal')" :class="{ active: difficulty === 'Normal' }">NORMAL</button>
                    <button @click="setDifficulty('Hard')" :class="{ active: difficulty === 'Hard' }">HARD</button>
                  </div>
                </div>
                <div class="setting-group">
                  <label for="speed-slider">初期速度: {{ initialSpeed.toFixed(2) }}</label>
                  <input 
                    type="range" 
                    id="speed-slider" 
                    min="0.1" 
                    max="2.5" 
                    step="0.01" 
                    v-model.number="initialSpeed"
                    class="slider"
                  >
                </div>
                <div v-if="difficulty === 'Practice'" class="setting-group">
                  <label for="word-count-slider">単語の数: {{ practiceWordCount }}</label>
                  <input 
                    type="range" 
                    id="word-count-slider" 
                    min="1" 
                    max="10" 
                    step="1" 
                    v-model.number="practiceWordCount"
                    class="slider"
                  >
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
    </div>
    <div class="input-display">
      <span>{{ currentInput }}</span>
      <span class="input-cursor"></span>
    </div>

    <input
      ref="hiddenInputRef"
      type="text"
      class="hidden-input"
      @input="handleMobileInput"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { wordList } from '../words';
import type { Word, GameState, Difficulty } from '../types';

// --- Game State ---
const score = ref(0);
const level = ref(1);
const lives = ref(5);
const currentInput = ref('');
const words = ref<Word[]>([]);
const gameState = ref<GameState>('start');

// --- Game Settings ---
const difficulty = ref<Difficulty>('Practice');
const initialSpeed = ref(0.8);
const practiceWordCount = ref(5);
let currentBaseSpeed = 1.0;

// --- Template Refs ---
const gameContainerRef = ref<HTMLElement | null>(null);
const gameAreaRef = ref<HTMLElement | null>(null);
const hiddenInputRef = ref<HTMLInputElement | null>(null);
let animationFrameId: number;

const gameSettings = {
  Practice: { spawnRate: 150, fontSize: 32, fontMultiplier: 20 },
  Normal: { spawnRate: 120, fontSize: 32, fontMultiplier: 20 },
  Hard: { spawnRate: 90, fontSize: 36, fontMultiplier: 22 }
};

const vibrantColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed', '#be2edd'];

// --- Game Logic ---
const initGame = () => {
  score.value = 0;
  level.value = 1;
  lives.value = 5;
  currentInput.value = '';
  words.value = [];
  gameState.value = 'playing';
  currentBaseSpeed = initialSpeed.value;

  if (difficulty.value === 'Practice') {
    for (let i = 0; i < practiceWordCount.value; i++) {
      spawnWord();
    }
  }
};

const startGame = () => {
  initGame();
  nextTick(() => {
    focusInput();
  });
  gameLoop();
};

const setDifficulty = (level: Difficulty) => {
  difficulty.value = level;
};

const spawnWord = () => {
  if (!gameAreaRef.value) return;
  const text = wordList[Math.floor(Math.random() * wordList.length)];
  const { fontMultiplier } = gameSettings[difficulty.value];
  const newWord: Word = {
    text,
    x: Math.random() * (gameAreaRef.value.clientWidth - text.length * fontMultiplier - 40) + 20,
    y: -40,
    speed: currentBaseSpeed + Math.random() * 0.5,
    color: vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
  };
  words.value.push(newWord);
};

let frameCount = 0;
const gameLoop = () => {
  if (gameState.value !== 'playing') return;

  if (difficulty.value === 'Practice') {
    if (words.value.length < practiceWordCount.value) {
      spawnWord();
    }
  } else {
    frameCount++;
    if (frameCount % gameSettings[difficulty.value].spawnRate === 0) {
      spawnWord();
    }
  }

  for (let i = words.value.length - 1; i >= 0; i--) {
    const word = words.value[i];
    word.y += word.speed;

    if (gameAreaRef.value && word.y > gameAreaRef.value.clientHeight) {
      words.value.splice(i, 1);
      lives.value--;
      if (lives.value <= 0) {
        gameOver();
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
  
  e.preventDefault();

  if (e.key === 'Backspace') {
    currentInput.value = currentInput.value.slice(0, -1);
  } else if (e.key.length === 1 && e.key.match(/[a-z0-9-]/i)) {
    currentInput.value += e.key.toLowerCase();
    checkInput();
  }
};

const handleMobileInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  currentInput.value = target.value.toLowerCase();
  checkInput();
}

const checkInput = () => {
  const index = words.value.findIndex(word => word.text === currentInput.value);
  if (index !== -1) {
    score.value += words.value[index].text.length * 10;
    words.value.splice(index, 1);
    
    currentInput.value = '';
    if(hiddenInputRef.value) {
      hiddenInputRef.value.value = '';
    }

    if (score.value > level.value * 500) {
      level.value++;
      if (difficulty.value !== 'Practice') {
         currentBaseSpeed += 0.2;
      }
    }
  }
};

const focusInput = () => {
  if(hiddenInputRef.value) {
    hiddenInputRef.value.focus();
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  cancelAnimationFrame(animationFrameId);
});

</script>

<style scoped>
.game-container {
    width: 100%;
    max-width: 800px;
    /* ★★★ 修正点: dvh（Dynamic Viewport Height）を使用 ★★★ */
    height: 100dvh; 
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    border: 2px solid #30363d;
    border-radius: 12px;
    background-color: #010409;
    box-shadow: 0 0 30px rgba(0, 128, 255, 0.2);
    position: relative;
    /* transitionは不要になったため削除 */
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
  top: -9999px;
  left: -9999px;
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
    max-height: 100%;
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
    max-width: 80%;
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
}

.setting-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.setting-group label {
    font-size: 1.2em;
    color: #8b949e;
}

.difficulty-selector {
    display: flex;
    gap: 20px;
}

.difficulty-selector button {
    font-family: 'Share Tech Mono', monospace;
    font-size: 1.2em;
    padding: 10px 20px;
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
    width: 250px;
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
</style>
