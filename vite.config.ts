import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 호스팅 시에도 에셋 경로가 올바르도록 base를 상대 경로로 설정
export default defineConfig({
  base: './',
  plugins: [vue()],
})
