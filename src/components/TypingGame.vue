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
                <div class="setting-group">
                  <label>効果音</label>
                  <div class="difficulty-selector">
                    <button @click="isSoundEnabled = true" :class="{ active: isSoundEnabled }">ON</button>
                    <button @click="isSoundEnabled = false" :class="{ active: !isSoundEnabled }">OFF</button>
                  </div>
                </div>
                <div class="setting-group" v-if="difficulty !== 'FingerDrill'">
                  <label for="speed-slider">速度倍率: x{{ speedMultiplier.toFixed(1) }}</label>
                  <input type="range" id="speed-slider" min="0.1" max="3.0" step="0.1" v-model.number="speedMultiplier" class="slider">
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
          
          <div v-if="showResult" class="drill-stats-container">
            TIME: <span>{{ elapsedTime }}s</span> | MISS: <span>{{ missCount }}</span>
          </div>
          <div v-else-if="startTime" class="drill-stats-container measuring">
            MEASURING...
          </div>
          <div v-else class="drill-stats-container empty">
            READY
          </div>

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
import { ref, computed, onMounted, onUnmounted, nextTick, watch, type CSSProperties } from 'vue';
import Keyboard from './Keyboard.vue'; 
import { englishWordList } from '../words_en';
import { practiceWordList } from '../practiceWords';
import { fingerMap } from '../fingering';
import type { Word, GameState, Difficulty } from '../types';

declare const Tone: any;

const score = ref(0);
const level = ref(1);
const lives = ref(5);
const words = ref<Word[]>([]);
const gameState = ref<GameState>('start');
const difficulty = ref<Difficulty>('FingerDrill');
const speedMultiplier = ref(1.0);
const practiceWordCount = ref(5);

// 計測用
const startTime = ref<number | null>(null);
const missCount = ref(0);
const elapsedTime = ref("0.0");
const showResult = ref(false);

let currentBaseSpeed = 1.0;
let wordIdCounter = 0;
let currentPracticeWordIndex = 0;
const currentInput = ref('');
const activeWordId = ref<number | null>(null);

const gameAreaRef = ref<HTMLElement | null>(null);
const gameMainContentRef = ref<HTMLElement | null>(null);
let animationFrameId: number;

const isSoundEnabled = ref(true);
let typeSound: any = null;
let wordCompleteSound: any = null;
let isAudioInitialized = false;

const BASE_FALL_SPEED = 0.5;
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
    const styles: { [key: number]: CSSProperties } = {};
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
  if (word.typed === word.target) return ' ';
  return word.target[currentInput.value.length] || null;
});

const initAudio = async () => {
    if (!isSoundEnabled.value || isAudioInitialized) return;
    try {
        await Tone.start();
        typeSound = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination();
        wordCompleteSound = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination();
        isAudioInitialized = true;
    } catch (e) {}
};

const resetStats = () => {
  startTime.value = null;
  missCount.value = 0;
  elapsedTime.value = "0.0";
  showResult.value = false;
};

const initGame = () => {
  score.value = 0; level.value = 1; lives.value = 5; words.value = [];
  gameState.value = 'playing';
  currentBaseSpeed = BASE_FALL_SPEED * speedMultiplier.value;
  wordIdCounter = 0; currentInput.value = ''; activeWordId.value = null;
  resetStats(); 

  if (difficulty.value === 'FingerDrill') {
    currentPracticeWordIndex = 0;
    spawnWord();
  } else if (difficulty.value === 'Practice') {
    for (let i = 0; i < practiceWordCount.value; i++) spawnWord();
  }
};

const startGame = async () => { await initAudio(); initGame(); nextTick(focusInput); gameLoop(); };
const setDifficulty = (level: Difficulty) => { difficulty.value = level; };
const getFinger = (char: string): string => fingerMap[char.toLowerCase()] || '??';

const spawnWord = () => {
  const gameArea = gameMainContentRef.value;
  if (!gameArea) return;
  let text = difficulty.value === 'FingerDrill' ? practiceWordList[currentPracticeWordIndex] : englishWordList[Math.floor(Math.random() * englishWordList.length)];
  const { fontSize, approxCharWidth } = gameSettings[difficulty.value];
  
  const wordWidth = text.length * (fontSize * approxCharWidth);
  const minX = (wordWidth / 2) + 20;
  const maxX = gameArea.clientWidth - (wordWidth / 2) - 20;
  
  const newWord: Word = {
    id: wordIdCounter++, display: text, target: text, typed: '',
    x: difficulty.value === 'FingerDrill' ? gameArea.clientWidth / 2 : Math.random() * (maxX - minX) + minX,
    y: difficulty.value === 'FingerDrill' ? 180 : -fontSize,
    speed: difficulty.value === 'FingerDrill' ? 0 : currentBaseSpeed + Math.random() * (0.3 * speedMultiplier.value),
    color: vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
    fingering: text.split('').map(char => ({ char, finger: getFinger(char) }))
  };
  words.value.push(newWord);
  if (difficulty.value === 'FingerDrill') activeWordId.value = newWord.id;
};

let frameCount = 0;
const gameLoop = () => {
  if (gameState.value !== 'playing') return;
  const gameArea = gameMainContentRef.value;
  if (!gameArea) return;

  if (difficulty.value !== 'FingerDrill') {
    if (difficulty.value === 'Practice' && words.value.length < practiceWordCount.value) spawnWord();
    else if (frameCount++ % gameSettings[difficulty.value].spawnRate === 0) spawnWord();
  }

  for (let i = words.value.length - 1; i >= 0; i--) {
    const word = words.value[i];
    word.y += word.speed;
    if (word.y > gameArea.clientHeight) {
      if (activeWordId.value === word.id) { activeWordId.value = null; currentInput.value = ''; }
      words.value.splice(i, 1);
      if (difficulty.value !== 'FingerDrill') {
        lives.value--;
        if (lives.value <= 0) gameOver();
      }
    }
  }
  animationFrameId = requestAnimationFrame(gameLoop);
};

const gameOver = () => { gameState.value = 'gameover'; cancelAnimationFrame(animationFrameId); };

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    gameState.value = 'start';
    cancelAnimationFrame(animationFrameId);
    return;
  }
  if (gameState.value !== 'playing' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' && difficulty.value === 'FingerDrill') {
    e.preventDefault();
    e.shiftKey ? previousWord() : nextWord();
    return;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    currentInput.value = currentInput.value.slice(0, -1);
    return;
  }
  if (e.key.length === 1) {
    e.preventDefault();
    currentInput.value += e.key;
  }
};

watch(currentInput, (newInput, oldInput) => {
  const activeWord = words.value.find(w => w.id === activeWordId.value);
  if (!activeWord) return;

  // ★追加：結果表示中に再入力が始まったら「次の計測」を開始する
  if (
    difficulty.value === 'FingerDrill' &&
    showResult.value &&
    oldInput.length === 0 &&
    newInput.length === 1
  ) {
    // 結果をクリアして即計測スタート（同じ単語の2回目以降に効く）
    missCount.value = 0;
    elapsedTime.value = "0.0";
    showResult.value = false;
    startTime.value = performance.now();
  }

  if (activeWord.target.startsWith(newInput)) {
    if (isSoundEnabled.value && typeSound && newInput.length > oldInput.length) {
      typeSound.triggerAttackRelease("C5", "8n");
    }

    // 計測開始（最初の1文字目）
    if (
      difficulty.value === 'FingerDrill' &&
      !startTime.value &&
      !showResult.value &&
      newInput.length === 1
    ) {
      startTime.value = performance.now();
      missCount.value = 0;
      elapsedTime.value = "0.0";
    }

    if (activeWord.target === newInput) {
      // 計測終了（入力完了）
      if (difficulty.value === 'FingerDrill' && startTime.value) {
        const endTime = performance.now();
        elapsedTime.value = ((endTime - startTime.value) / 1000).toFixed(1);
        showResult.value = true;
        startTime.value = null;
      }
      wordCompleted(activeWord);
    }
  } else {
    if (newInput.length > oldInput.length) {
      missCount.value++;
    }
    currentInput.value = oldInput;
  }
});


const wordCompleted = (word: Word) => {
  score.value += word.target.length * 10;
  if (isSoundEnabled.value && wordCompleteSound) {
    wordCompleteSound.triggerAttackRelease("E6", "8n", Tone.now());
  }
  if (difficulty.value === 'FingerDrill') {
    word.typed = word.target;
    currentInput.value = '';
  } else {
    words.value = words.value.filter(w => w.id !== word.id);
    currentInput.value = '';
    activeWordId.value = null;
  }
};

const nextWord = () => {
  currentPracticeWordIndex = (currentPracticeWordIndex + 1) % practiceWordList.length;
  words.value = []; currentInput.value = ''; activeWordId.value = null;
  resetStats(); 
  spawnWord();
  focusInput();
}

const previousWord = () => {
  currentPracticeWordIndex = (currentPracticeWordIndex - 1 + practiceWordList.length) % practiceWordList.length;
  words.value = []; currentInput.value = ''; activeWordId.value = null;
  resetStats(); 
  spawnWord();
  focusInput();
}

const focusInput = () => { (gameAreaRef.value?.closest('.game-container') as HTMLElement)?.focus(); };
onMounted(() => { window.addEventListener('keydown', handleKeyDown); });
onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); cancelAnimationFrame(animationFrameId); });
</script>


<style scoped>
.word.active {
  background-color: rgba(88, 166, 255, 0.25);
  border-radius: 8px;
  transform: translateX(-50%) scale(1.15);
  transition: all 0.1s ease-in-out;
  box-shadow: 0 0 15px rgba(88, 166, 255, 0.7);
  z-index: 5;
}
.game-container { outline: none; }
.fingering-guide { display: flex; gap: 2px; margin-top: 8px; font-size: 0.5em; opacity: 0.9; }
.fingering-guide span { display: inline-block; width: 24px; text-align: center; border-radius: 4px; padding: 2px 0; color: white; font-weight: bold; }
.fingering-guide span.typed { opacity: 0.4; }
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
.game-container { width: 100%; max-width: 800px; height: 100%; display: flex; flex-direction: column; border: 2px solid #30363d; border-radius: 12px; background-color: #010409; box-shadow: 0 0 30px rgba(0, 128, 255, 0.2); position: relative; overflow: hidden; }
header { display: flex; justify-content: space-between; padding: 15px 25px; background-color: #161b22; border-bottom: 2px solid #30363d; flex-shrink: 0; }
.stats { font-size: 1.4em; letter-spacing: 2px; }
.stats span { color: #58a6ff; font-weight: bold; }
.game-area { flex-grow: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.game-main-content { position: relative; width: 100%; flex-grow: 1; }
.word { position: absolute; transform: translateX(-50%); font-family: 'Share Tech Mono', monospace; font-weight: bold; text-shadow: 0 0 10px currentColor, 0 0 5px rgba(255,255,255,0.7); white-space: nowrap; display: flex; flex-direction: column; align-items: center; padding: 4px 8px; }
.display-text-wrapper { display: flex; }
.char-display.typed { color: #a5d6ff; }
.input-display { padding: 15px; background-color: rgba(22, 27, 34, 0.9); border-top: 2px solid #30363d; text-align: center; font-size: 2em; color: #58a6ff; letter-spacing: 4px; min-height: 40px; flex-shrink: 0; }
.input-cursor { display: inline-block; width: 12px; height: 28px; background-color: #58a6ff; animation: blink 1s step-end infinite; vertical-align: bottom; margin-left: 5px; }
@keyframes blink { from, to { background-color: transparent; } 50% { background-color: #58a6ff; } }
.modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(1, 4, 9, 0.85); display: flex; justify-content: center; align-items: center; z-index: 10; }
.modal-content { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; }
.modal h1 { font-size: 4em; color: #58a6ff; text-shadow: 0 0 15px #58a6ff; margin-bottom: 20px; }
.start-button { font-family: 'Share Tech Mono', monospace; font-size: 1.5em; padding: 15px 30px; margin-top: 30px; border: 2px solid #58a6ff; background-color: transparent; color: #58a6ff; cursor: pointer; transition: all 0.3s ease; letter-spacing: 2px; border-radius: 6px; }
.start-button:hover { background-color: #58a6ff; color: #010409; box-shadow: 0 0 20px #58a6ff; }
.settings-container { display: flex; flex-direction: column; gap: 20px; margin-top: 30px; align-items: center; }
.difficulty-selector { display: flex; gap: 10px; justify-content: center; }
.difficulty-selector button { font-family: 'Share Tech Mono', monospace; font-size: 1.1em; padding: 10px 15px; border: 2px solid #8b949e; background-color: transparent; color: #8b949e; cursor: pointer; border-radius: 6px; transition: all 0.3s ease; }
.difficulty-selector button.active { border-color: #58a6ff; color: #58a6ff; box-shadow: 0 0 10px #58a6ff; }
.slider { width: 280px; height: 8px; background: #30363d; outline: none; border-radius: 4px; opacity: 0.7; transition: opacity .2s; }
.bottom-area { position: relative; padding: 10px; flex-shrink: 0; }
.drill-navigation { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 10px; box-sizing: border-box; }
.nav-button { font-family: 'Share Tech Mono', monospace; font-size: 1em; padding: 8px 16px; border: 2px solid #2ed573; background-color: rgba(46, 213, 115, 0.1); color: #2ed573; cursor: pointer; transition: all 0.3s ease; border-radius: 6px; }
.prev-button { border-color: #f97316; background-color: rgba(249, 115, 22, 0.1); color: #f97316; }
.drill-instructions { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 550px; padding: 8px; background-color: rgba(22, 27, 34, 0.9); color: #8b949e; text-align: center; border-radius: 8px; border: 1px solid #30363d; z-index: 5; }

.drill-stats-container {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.2em;
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
  padding: 5px 15px;
  border: 1px solid #58a6ff;
  border-radius: 4px;
  min-width: 200px;
  text-align: center;
}
.drill-stats-container.measuring { color: #f1e05a; border-color: #f1e05a; animation: pulse 1s infinite; }
.drill-stats-container.empty { color: #8b949e; border-color: #30363d; opacity: 0.5; }
.drill-stats-container span { font-weight: bold; color: white; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>