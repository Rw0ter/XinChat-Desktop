<template>
    <Panel title="选项卡 1" description="这是 list1 对应的页面。">
        <div class="panel-grid">
            <div class="panel-card">
                <div class="card-title">模块 A</div>
                <div class="card-desc">这里放你的按钮、列表、功能入口。</div>
            </div>
            <div class="panel-card">
                <div class="card-title">模块 B</div>
                <div class="card-desc">这里放你的状态、信息卡片、统计。</div>
            </div>
        </div>
    </Panel>
</template>

<script setup>
import Panel from '../components/Panel.vue';
</script>

<style scoped>
.panel-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

@media (max-width: 720px) {
    .panel-grid {
        grid-template-columns: 1fr;
    }
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
