<template>
    <div id="titlebar">
        <div id="title">
            <img src="/img/logo.png" class="logo" />
            <span>Visual Paste</span>
        </div>

        <div id="window-controls">
            <button class="wc-btn" @click="minimizeWindow" title="最小化">
                <span class="wc-icon">&#xE921;</span>
            </button>
            <button class="wc-btn" @click="maximizeWindow" title="最大化">
                <span class="wc-icon">&#xE922;</span>
            </button>
            <button class="wc-btn close" @click="closeWindow" title="关闭">
                <span class="wc-icon">&#xE8BB;</span>
            </button>
        </div>
    </div>
</template>

<script setup>
const minimizeWindow = () => window.electronAPI?.windowMin?.();
const maximizeWindow = () => window.electronAPI?.windowMax?.();
const closeWindow = () => window.electronAPI?.windowClose?.();
</script>

<style scoped>
#titlebar {
    position: fixed;
    inset: 0 0 auto 0;
    height: var(--titlebar-h);
    background: var(--titlebar-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--glass-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    -webkit-app-region: drag;
    user-select: none;
    z-index: 1000;
}

#title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 10px;
    font-size: 12px;
}

.logo {
    width: 20px;
    height: 20px;
}

#window-controls {
    display: flex;
    -webkit-app-region: no-drag;
}

.wc-btn {
    width: 46px;
    height: var(--titlebar-h);
    background: transparent;
    border: none;
    color: #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
}

.wc-btn:hover {
    background: rgba(255, 255, 255, 0.08);
}

html[data-theme="light"] .wc-btn {
    color: #666;
}

html[data-theme="light"] .wc-btn:hover {
    background: rgba(0, 0, 0, 0.08);
}

.wc-btn.close:hover {
    background: #c42b1c;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 10px;
}
</style>
