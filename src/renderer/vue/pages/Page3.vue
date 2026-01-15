<template>
    <Panel title="选项卡 3" description="这是 list3 对应的页面。">
        <div class="panel-card">
            <div class="card-title">信息面板</div>
            <div class="card-desc">你可以放日志、提示、最近任务等。</div>
        </div>
    </Panel>
</template>

<script setup>
import Panel from '../components/Panel.vue';
</script>

<style scoped>
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
