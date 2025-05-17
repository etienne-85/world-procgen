import { defineConfig } from 'vite'

export default defineConfig({
  base: '/world-procgen/',
  server: {
    fs: {
      strict: false,
    },
  },
})
