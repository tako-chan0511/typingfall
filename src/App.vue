<!-- src/App.vue -->
<template>
  <div id="app">
    <TypingGame />
  </div>
</template>

<script setup lang="ts">
import TypingGame from './components/TypingGame.vue';
</script>

<style>
/* グローバルスタイル */
body {
    background-color: #0d1117;
    color: #c9d1d9;
    /* このフォントをGoogle Fontsから読み込む必要があります */
    font-family: 'Share Tech Mono', monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    overflow: hidden;
}

#app {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
