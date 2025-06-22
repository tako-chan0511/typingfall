<!-- src/components/Keyboard.vue -->
<template>
  <!-- キーボード全体のコンテナ -->
  <div class="keyboard-container">
    <!-- 行のループ描画 (v-for) -->
    <div v-for="(row, rowIndex) in keyboardLayout" :key="rowIndex" class="keyboard-row">
      <!-- 各行のキーをループ描画 (v-for) -->
      <div
        v-for="keyInfo in row"
        :key="keyInfo.code"
        class="key"
        :class="[keyInfo.class, { 'highlight': shouldHighlight(keyInfo) }]"
        :style="{ flexGrow: keyInfo.size || 1 }"
      >
        <!-- キーキャップに表示する文字 -->
        <span>{{ keyInfo.display }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// キー1つ分の情報を定義するインターフェース
interface KeyInfo {
  key: string;      // Shiftキーを押さない場合の文字 (例: 'a')
  shifted: string | null; // Shiftキーを押した場合の文字 (例: 'A')
  display: string;  // キーキャップに表示する文字 (例: 'a')
  code: string;     // JavaScriptのキーイベントで識別するためのコード (例: 'KeyA')
  size?: number;    // キーの相対的な幅 (flex-grow)
  class?: string;   // 特別なスタイルを適用するためのCSSクラス
}

// 親コンポーネント(TypingGame.vue)から受け取るプロパティ
const props = defineProps<{
  highlightKey: string | null; // ハイライトすべき文字 (例: 'a', 'F', '!')
}>();

// キーボードのレイアウトを定義するデータ構造
const keyboardLayout: KeyInfo[][] = [
    // 1段目
    [
        { key: '`', shifted: '~', display: '`', code: 'Backquote' }, { key: '1', shifted: '!', display: '1', code: 'Digit1' }, { key: '2', shifted: '@', display: '2', code: 'Digit2' }, { key: '3', shifted: '#', display: '3', code: 'Digit3' }, { key: '4', shifted: '$', display: '4', code: 'Digit4' }, { key: '5', shifted: '%', display: '5', code: 'Digit5' }, { key: '6', shifted: '^', display: '6', code: 'Digit6' }, { key: '7', shifted: '&', display: '7', code: 'Digit7' }, { key: '8', shifted: '*', display: '8', code: 'Digit8' }, { key: '9', shifted: '(', display: '9', code: 'Digit9' }, { key: '0', shifted: ')', display: '0', code: 'Digit0' }, { key: '-', shifted: '_', display: '-', code: 'Minus' }, { key: '=', shifted: '+', display: '=', code: 'Equal' }, { key: 'Backspace', shifted: null, display: 'Backspace', code: 'Backspace', size: 2, class: 'special-key' }
    ],
    // 2段目
    [
        { key: 'Tab', shifted: null, display: 'Tab', code: 'Tab', size: 1.5, class: 'special-key' }, { key: 'q', shifted: 'Q', display: 'q', code: 'KeyQ' }, { key: 'w', shifted: 'W', display: 'w', code: 'KeyW' }, { key: 'e', shifted: 'E', display: 'e', code: 'KeyE' }, { key: 'r', shifted: 'R', display: 'r', code: 'KeyR' }, { key: 't', shifted: 'T', display: 't', code: 'KeyT' }, { key: 'y', shifted: 'Y', display: 'y', code: 'KeyY' }, { key: 'u', shifted: 'U', display: 'u', code: 'KeyU' }, { key: 'i', shifted: 'I', display: 'i', code: 'KeyI' }, { key: 'o', shifted: 'O', display: 'o', code: 'KeyO' }, { key: 'p', shifted: 'P', display: 'p', code: 'KeyP' }, { key: '[', shifted: '{', display: '[', code: 'BracketLeft' }, { key: ']', shifted: '}', display: ']', code: 'BracketRight' }, { key: '\\', shifted: '|', display: '\\', code: 'Backslash', size: 1.5 }
    ],
    // 3段目
    [
        { key: 'CapsLock', shifted: null, display: 'Caps Lock', code: 'CapsLock', size: 1.8, class: 'special-key' }, { key: 'a', shifted: 'A', display: 'a', code: 'KeyA' }, { key: 's', shifted: 'S', display: 's', code: 'KeyS' }, { key: 'd', shifted: 'D', display: 'd', code: 'KeyD' }, { key: 'f', shifted: 'F', display: 'f', code: 'KeyF' }, { key: 'g', shifted: 'G', display: 'g', code: 'KeyG' }, { key: 'h', shifted: 'H', display: 'h', code: 'KeyH' }, { key: 'j', shifted: 'J', display: 'j', code: 'KeyJ' }, { key: 'k', shifted: 'K', display: 'k', code: 'KeyK' }, { key: 'l', shifted: 'L', display: 'l', code: 'KeyL' }, { key: ';', shifted: ':', display: ';', code: 'Semicolon' }, { key: "'", shifted: '"', display: "'", code: 'Quote' }, { key: 'Enter', shifted: null, display: 'Enter', code: 'Enter', size: 2.2, class: 'special-key' }
    ],
    // 4段目
    [
        { key: 'Shift', shifted: null, display: 'Shift', code: 'ShiftLeft', size: 2.5, class: 'special-key' }, { key: 'z', shifted: 'Z', display: 'z', code: 'KeyZ' }, { key: 'x', shifted: 'X', display: 'x', code: 'KeyX' }, { key: 'c', shifted: 'C', display: 'c', code: 'KeyC' }, { key: 'v', shifted: 'V', display: 'v', code: 'KeyV' }, { key: 'b', shifted: 'B', display: 'b', code: 'KeyB' }, { key: 'n', shifted: 'N', display: 'n', code: 'KeyN' }, { key: 'm', shifted: 'M', display: 'm', code: 'KeyM' }, { key: ',', shifted: '<', display: ',', code: 'Comma' }, { key: '.', shifted: '>', display: '.', code: 'Period' }, { key: '/', shifted: '?', display: '/', code: 'Slash' }, { key: 'Shift', shifted: null, display: 'Shift', code: 'ShiftRight', size: 2.5, class: 'special-key' }
    ],
    // 5段目
    [
        { key: ' ', shifted: null, display: 'Space', code: 'Space', size: 8, class: 'special-key space-key' }
    ]
];

/**
 * ハイライトすべきキーの情報を特定するComputedプロパティ
 * @returns {object | null} ハイライトすべきキーのcodeとShiftキーが必要かどうかの情報
 */
const keyToHighlightInfo = computed(() => {
    if (!props.highlightKey) return null; // ハイライト対象がなければnullを返す

    // keyboardLayoutを全検索して、押すべき文字に一致するキーを探す
    for (const row of keyboardLayout) {
        for (const keyInfo of row) {
            // Shiftなしの文字か、Shiftありの文字に一致するかをチェック
            if (keyInfo.key === props.highlightKey || keyInfo.shifted === props.highlightKey) {
                return { 
                    code: keyInfo.code, // 'KeyF' のような物理キーコード
                    needsShift: keyInfo.shifted === props.highlightKey // Shiftキーが必要かどうか
                };
            }
        }
    }
    return null; // 見つからなければnull
});

/**
 * 特定のキー（キーボードの絵の1つ1つ）をハイライトすべきか判定する関数
 * @param {KeyInfo} keyInfo - 判定対象のキーの情報
 * @returns {boolean} ハイライトするならtrue
 */
const shouldHighlight = (keyInfo: KeyInfo): boolean => {
  if (!keyToHighlightInfo.value) return false;
  
  // 押すべきキーのcodeと、今描画しようとしているキーのcodeが一致すればハイライト
  if (keyInfo.code === keyToHighlightInfo.value.code) {
    return true;
  }

  // 押すべきキーがShiftを必要とする場合、Shiftキー自体もハイライト
  if (keyToHighlightInfo.value.needsShift && (keyInfo.code === 'ShiftLeft' || keyInfo.code === 'ShiftRight')) {
    return true;
  }

  return false;
};
</script>

<style scoped>
/* キーボード全体のスタイル */
.keyboard-container {
  width: 100%;
  max-width: 800px;
  padding: 10px;
  background-color: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  box-sizing: border-box;
}
/* キーボードの各行のスタイル */
.keyboard-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.keyboard-row:last-child {
  margin-bottom: 0;
}
/* 個々のキーの基本スタイル */
.key {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50px;
  margin: 0 4px;
  border-radius: 6px;
  background: linear-gradient(to bottom, #555, #333);
  color: white;
  font-size: 1.1em;
  font-family: 'Share Tech Mono', monospace, sans-serif;
  box-shadow: 0 3px 0 #222;
  position: relative;
  transition: all 0.07s ease;
  min-width: 50px;
  box-sizing: border-box;
  text-transform: uppercase;
}
.key span {
    text-align: center;
}
/* EnterやShiftなどの特殊キー用のスタイル */
.key.special-key {
  font-size: 0.9em;
  background: linear-gradient(to bottom, #666, #444);
}
.key.space-key {
    min-width: 200px;
}
/* ハイライト時のスタイル */
.key.highlight {
  background: linear-gradient(to bottom, #63B3ED, #3182CE);
  box-shadow: 0 0 20px #63B3ED, 0 3px 0 #2c5282;
  transform: translateY(1px); /* 少し沈むようなエフェクト */
  color: white;
}
</style>