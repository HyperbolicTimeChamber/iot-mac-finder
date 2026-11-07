import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://hyperbolictimechamber.github.io/iot-mac-finder/
export default defineConfig({
  plugins: [react()],
  base: '/iot-mac-finder/',
})
