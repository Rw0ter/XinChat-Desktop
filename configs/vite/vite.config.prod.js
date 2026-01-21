import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererRoot = path.resolve(__dirname, '../../src/renderer');
const publicRoot = path.resolve(__dirname, '../../public');

export default defineConfig({
    root: rendererRoot,
    publicDir: publicRoot,
    base: './',
    plugins: [vue()],
    build: {
        outDir: path.resolve(__dirname, '../../dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(rendererRoot, 'index.html'),
                login: path.resolve(rendererRoot, 'login.html'),
                found_friend: path.resolve(rendererRoot, 'found_friend.html'),
                image_preview: path.resolve(rendererRoot, 'image_preview.html'),
                voice_call: path.resolve(rendererRoot, 'voice_call.html')
            }
        }
    }
});
