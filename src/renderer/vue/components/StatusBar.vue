<template>
    <div id="status">
        <span>{{ store.status }}</span>
        <span class="status-right">
            {{ store.activeTab }} · {{ store.activeLabel }} · {{ store.theme }}
        </span>
    </div>
</template>

<script setup>
import { useAppStore } from '../store/app.js';

const store = useAppStore();
</script>

<style scoped>
#status {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--statusbar-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 12px;
    background-color: #007acc;
    color: #ffffff;
    z-index: 999;
}

.status-right {
    opacity: 0.9;
}
</style>
