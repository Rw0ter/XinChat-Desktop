<template>
    <div class="panel">
        <div class="panel-title">{{ title }}</div>
        <div class="panel-desc">{{ description }}</div>
        <slot></slot>
    </div>
</template>

<script setup>
defineProps({
    title: String,
    description: String,
});
</script>

<style scoped>
.panel {
    flex: 1;
    background: var(--panel-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 14px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    overflow-y: auto;
}

html[data-theme="light"] .panel {
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

.panel-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
}

.panel-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
}
</style>
