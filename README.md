# electron-project

This is an Electron + Vue project scaffolded locally.

## Overview

- Electron application with Vue frontend

## Structure

- `src/electron/`: Electron 主进程与预加载脚本（生产/测试共用）
- `src/renderer/`: Vite 渲染层根目录
  - `index.html`: 主界面入口
  - `login.html`: 登录注册入口
  - `vue/`: Vue 应用源码
- `configs/vite/`: Vite 配置（本地测试/上线分离）
- `scripts/`: 本地开发启动脚本

## Development (本地测试)

- Install dependencies: `npm install`
- Start dev (Vite + Electron): `npm run dev`
  - Uses `configs/vite/vite.config.dev.js`

## Production (上线版本)

- Build renderer + package: `npm run build`
  - Uses `configs/vite/vite.config.prod.js`
- Start packaged app (after build): `npm run start`

## License

MIT — see `LICENSE` file.
