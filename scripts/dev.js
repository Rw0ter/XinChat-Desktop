#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const shell = isWindows ? true : false;

// 启动 Vite 开发服务器
const vite = spawn(
    isWindows ? 'cmd' : 'sh',
    isWindows ? ['/c', 'npm run vite:dev'] : ['-c', 'npm run vite:dev'],
    {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: 'true' },
        shell
    }
);

vite.on('error', (err) => {
    console.error('Failed to start Vite:', err);
    process.exit(1);
});

// 等待 Vite 启动完成后启动 Electron
setTimeout(() => {
    const env = { ...process.env };
    env.VITE_DEV_SERVER_URL = 'http://localhost:5173';

    const electron = spawn(
        isWindows ? 'cmd' : 'sh',
        isWindows ? ['/c', 'npx electron . --no-sandbox'] : ['-c', 'npx electron . --no-sandbox'],
        {
            cwd: projectRoot,
            stdio: 'inherit',
            env: env,
            shell
        }
    );

    electron.on('error', (err) => {
        console.error('Failed to start Electron:', err);
        process.exit(1);
    });

    electron.on('exit', () => {
        vite.kill();
        process.exit(0);
    });
}, 3000);
