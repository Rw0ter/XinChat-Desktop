import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererRoot = path.resolve(__dirname, '../../src/renderer');

export default defineConfig({
    root: rendererRoot,
    plugins: [vue()],
    server: {
        middlewareMode: false
    }
});
