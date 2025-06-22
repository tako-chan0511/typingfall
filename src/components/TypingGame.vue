<!-- src/components/TypingGame.vue -->
<template>
  <div class="game-container" @click="focusInput" tabindex="-1">
    <header>
      <div class="stats">SCORE: <span>{{ score }}</span></div>
      <div class="stats">LEVEL: <span>{{ level }}</span></div>
      <div class="stats" v-if="difficulty !== 'FingerDrill'">LIVES: <span>{{ lives }}</span></div>
    </header>
    <div class="game-area" ref="gameAreaRef">
      <div class="game-main-content" ref="gameMainContentRef">
        <div v-if="difficulty === 'FingerDrill' && gameState === 'playing'" class="drill-instructions">
          <p><strong>指使いマスターモード</strong></p>
          <p>
            単語の下のガイドとキーボードを頼りに、<br>
            正しい指の動きを繰り返し練習しよう！
          </p>
        </div>

        <div
          v-for="word in words"
          :key="word.id"
          class="word"
          :class="{ active: activeWordId === word.id }"
          :style="wordStyles[word.id] || {}"
        >
          <div class="display-text-wrapper">
            <span
              v-for="(char, index) in word.display.split('')"
              :key="index"
              :class="{ typed: (activeWordId === word.id ? currentInput.length : word.typed.length) > index }"
              class="char-display"
            >
              {{ char }}
            </span>
          </div>
          <div v-if="difficulty === 'FingerDrill'" class="fingering-guide">
            <span v-for="(f, index) in word.fingering" :key="index" :class="['finger-' + f.finger.charAt(0).toLowerCase() + f.finger.charAt(1) , 'finger-hand-' + f.finger.charAt(0).toLowerCase(), { typed: (activeWordId === word.id ? currentInput.length : word.typed.length) > index }]">
              {{ f.finger }}
            </span>
          </div>
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

      <div class="bottom-area">
        <div v-if="difficulty === 'FingerDrill' && gameState === 'playing'" class="drill-navigation">
          <button @click="previousWord" class="nav-button prev-button">
            (Shift+Space) 前の単語へ
          </button>
          <button @click="nextWord" class="nav-button next-button">
            次の単語へ (Space)
          </button>
        </div>
        <Keyboard v-if="difficulty === 'FingerDrill' && gameState === 'playing'" :highlight-key="nextKeyToPress" />
      </div>

    </div>

    <div class="input-display">
      <span>{{ currentInput }}</span>
      <span class="input-cursor"></span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import Keyboard from './Keyboard.vue'; 
import { englishWordList } from '../words_en';
import { practiceWordList } from '../practiceWords';
import { fingerMap } from '../fingering';
import type { Word, GameState, Difficulty } from '../types';

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
const activeWordId = ref<number | null>(null);

const gameAreaRef = ref<HTMLElement | null>(null);
const gameMainContentRef = ref<HTMLElement | null>(null);
let animationFrameId: number;

const gameSettings = {
  FingerDrill: { spawnRate: Infinity, fontSize: 48, approxCharWidth: 0.65 },
  Practice: { spawnRate: 150, fontSize: 32, approxCharWidth: 0.6 },
  Normal: { spawnRate: 120, fontSize: 32, approxCharWidth: 0.6 },
  Hard: { spawnRate: 90, fontSize: 36, approxCharWidth: 0.6 }
};

const vibrantColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff', '#70a1ff', '#5352ed', '#be2edd'];

const wordStyles = computed(() => {
    const gameArea = gameMainContentRef.value;
    if (!gameArea) return {};

    const containerWidth = gameArea.clientWidth - 20;
    const styles: { [key: number]: object } = {};

    words.value.forEach(word => {
        const settings = gameSettings[difficulty.value];
        const defaultFontSize = settings.fontSize;
        const wordWidth = word.target.length * (defaultFontSize * settings.approxCharWidth);
        
        const scale = wordWidth > containerWidth ? containerWidth / wordWidth : 1;
        const finalFontSize = defaultFontSize * scale;

        styles[word.id] = {
            left: word.x + 'px',
            top: word.y + 'px',
            color: word.color,
            fontSize: finalFontSize + 'px',
            transform: 'translateX(-50%)',
        };
    });
    return styles;
});

const nextKeyToPress = computed(() => {
  if (difficulty.value !== 'FingerDrill' || gameState.value !== 'playing') return null;
  const word = words.value[0];
  if (!word) return null;

  if (word.typed === word.target) {
      return ' ';
  }
  
  const nextChar = word.target[currentInput.value.length];

  return nextChar || null;
});

const initGame = () => {
  score.value = 0;
  level.value = 1;
  lives.value = 5;
  words.value = [];
  gameState.value = 'playing';
  currentBaseSpeed = initialSpeed.value;
  wordIdCounter = 0;
  currentInput.value = '';
  activeWordId.value = null;

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
  const gameArea = gameMainContentRef.value;
  if (!gameArea) return;

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
    x: difficulty.value === 'FingerDrill' ? gameArea.clientWidth / 2 : Math.random() * Math.max(0, gameArea.clientWidth - textWidth - 40) + 20,
    y: difficulty.value === 'FingerDrill' ? 100 : -fontSize,
    speed: difficulty.value === 'FingerDrill' ? 0 : currentBaseSpeed + Math.random() * 0.5,
    color: vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
    fingering: text.split('').map(char => ({ char, finger: getFinger(char) }))
  };
  words.value.push(newWord);
  if (difficulty.value === 'FingerDrill') {
    activeWordId.value = newWord.id;
  }
};

let frameCount = 0;
const gameLoop = () => {
  if (gameState.value !== 'playing') return;

  const gameArea = gameMainContentRef.value;
  if (!gameArea) return;

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

    if (word.y > gameArea.clientHeight) {
      if (activeWordId.value === word.id) {
          activeWordId.value = null;
          currentInput.value = '';
      }
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

const returnToStartScreen = () => {
  gameState.value = 'start';
  cancelAnimationFrame(animationFrameId);
  words.value = [];
  currentInput.value = '';
  activeWordId.value = null;
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (gameState.value !== 'start') {
      returnToStartScreen();
    }
    return;
  }
  
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

  if (e.key === 'Backspace') {
    e.preventDefault();
    currentInput.value = currentInput.value.slice(0, -1);
    return;
  }
  
  if (e.key.length === 1) {
    e.preventDefault();
    
    if (difficulty.value === 'FingerDrill' && words.value.length > 0 && words.value[0].typed === words.value[0].target) {
      words.value[0].typed = ''; 
      currentInput.value = '';  
    }
    
    currentInput.value += e.key;
  }
};

watch(currentInput, (newInput, oldInput) => {
    if (difficulty.value === 'FingerDrill' && words.value.length > 0 && activeWordId.value === null) {
        activeWordId.value = words.value[0].id;
    }

    const activeWord = words.value.find(w => w.id === activeWordId.value);

    if (activeWord) {
        if (activeWord.typed === activeWord.target) {
            activeWord.typed = '';
        }

        if(activeWord.target.startsWith(newInput)) {
            if (activeWord.target === newInput) {
                wordCompleted(activeWord);
            }
        } else {
            currentInput.value = oldInput;
        }
    } else {
        const matchingWords = words.value.filter(w => w.target.startsWith(newInput));
        
        if (matchingWords.length === 1) {
            const target = matchingWords[0];
            activeWordId.value = target.id;
            if (target.target === newInput) {
                wordCompleted(target);
            }
        } else if (matchingWords.length === 0) {
            currentInput.value = oldInput;
        }
    }
});


const wordCompleted = (word: Word) => {
  score.value += word.target.length * 10;
  
  if (difficulty.value === 'FingerDrill') {
    const completedWord = words.value.find(w => w.id === word.id);
    if (completedWord) {
        completedWord.typed = currentInput.value;
    }
    currentInput.value = '';
    activeWordId.value = null;
  } else {
    words.value = words.value.filter(w => w.id !== word.id);
    currentInput.value = '';
    activeWordId.value = null;
  }
  
  if (score.value > level.value * 500 && difficulty.value !== 'Practice' && difficulty.value !== 'FingerDrill') {
    level.value++;
    currentBaseSpeed += 0.2;
  }
};

const nextWord = () => {
  if (difficulty.value !== 'FingerDrill') return;
  words.value = [];
  currentInput.value = '';
  activeWordId.value = null;
  currentPracticeWordIndex = (currentPracticeWordIndex + 1) % practiceWordList.length;
  spawnWord();
  focusInput();
}

const previousWord = () => {
  if (difficulty.value !== 'FingerDrill') return;
  words.value = [];
  currentInput.value = '';
  activeWordId.value = null;
  currentPracticeWordIndex--;
  if (currentPracticeWordIndex < 0) {
    currentPracticeWordIndex = practiceWordList.length - 1;
  }
  spawnWord();
  focusInput();
}

const focusInput = () => {
    const container = gameAreaRef.value?.closest('.game-container') as HTMLElement;
    container?.focus();
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
.game-container {
    outline: none;
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
.finger-hand-l { background-color: #c53030; }
.finger-hand-r { background-color: #2c5282; }
.finger-l5 { background-color: #E53E3E; }
.finger-l4 { background-color: #DD6B20; }
.finger-l3 { background-color: #ED8936; }
.finger-l2 { background-color: #FBB6CE; color: #333;}
.finger-r2 { background-color: #63B3ED; }
.finger-r3 { background-color: #4299E1; }
.finger-r4 { background-color: #3182CE; }
.finger-r5 { background-color: #38B2AC; }

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
    height: 100%;
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
    display: flex;
    flex-direction: column;
}
.game-main-content {
    position: relative;
    width: 100%;
    flex-grow: 1;
}

.word {
    position: absolute;
    transform: translateX(-50%);
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
  transform: translateX(-50%) scale(1.1);
  transition: transform 0.1s ease-in-out, background-color 0.1s ease-in-out;
}
.display-text-wrapper {
  display: flex;
}
.char-display.typed {
  color: #a5d6ff;
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
.bottom-area {
    position: relative;
    padding: 10px;
    flex-shrink: 0; 
}
.drill-navigation {
  width: 100%;
  max-width: 800px;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  margin: 0 auto 20px;
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
.drill-instructions {
  position: absolute;
  top: 10px; /* ★★★ 修正: 説明文の位置を調整 ★★★ */
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  padding: 10px; /* ★★★ 修正: パディングを調整 ★★★ */
  background-color: rgba(22, 27, 34, 0.9);
  color: #8b949e;
  text-align: center;
  border-radius: 8px;
  border: 1px solid #30363d;
  z-index: 5;
  font-size: 1em; /* ★★★ 修正: フォントサイズを調整 ★★★ */
  line-height: 1.5;
}
.drill-instructions p {
  margin: 0;
}
.drill-instructions strong {
  color: #58a6ff;
  font-size: 1.2em; /* ★★★ 修正: フォントサイズを調整 ★★★ */
  display: block;
  margin-bottom: 8px;
}
</style>
