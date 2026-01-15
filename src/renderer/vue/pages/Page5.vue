<template>
    <Panel title="主题设置" description="切换应用主题。">
        <div class="settings-row">
            <span class="settings-label">主题模式</span>
            <select class="settings-select" v-model="store.theme">
                <option value="dark">暗色</option>
                <option value="light">亮色</option>
            </select>
        </div>

        <div class="panel-card">
            <div class="card-title">当前主题</div>
            <div class="card-desc">
                {{ store.theme === 'dark' ? '暗色（dark）' : '亮色（light）' }}
            </div>
        </div>
    </Panel>
</template>

<script setup>
import Panel from '../components/Panel.vue';
import { useAppStore } from '../store/app.js';

const store = useAppStore();
</script>

<style scoped>
.settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
    margin-bottom: 12px;
}

html[data-theme="light"] .settings-row {
    background: rgba(0, 0, 0, 0.03);
}

.settings-label {
    font-size: 13px;
    color: var(--text-primary);
}

.settings-select {
    min-width: 140px;
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 6px 10px;
    outline: none;
    cursor: pointer;
}

.panel-card {
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
    padding: 12px;
}

html[data-theme="light"] .panel-card {
    background: rgba(0, 0, 0, 0.03);
}

.card-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
}

.card-desc {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
}
</style>
