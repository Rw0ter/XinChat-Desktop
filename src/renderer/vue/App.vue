<template>
    <!-- 标题栏 -->
    <TitleBar />

    <!-- 左侧导航 -->
    <Sidebar />

    <!-- 内容区 -->
    <div id="content">
        <div class="page">
            <Page1 v-show="store.activeTab === 'list1'" />
            <Page2 v-show="store.activeTab === 'list2'" />
            <Page3 v-show="store.activeTab === 'list3'" />
            <Page4 v-show="store.activeTab === 'list4'" />
            <Page5 v-show="store.activeTab === 'list5'" />
        </div>
    </div>

    <!-- 状态栏 -->
    <StatusBar />
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useAppStore } from './store/app.js';
import TitleBar from './components/TitleBar.vue';
import Sidebar from './components/Sidebar.vue';
import StatusBar from './components/StatusBar.vue';
import Page1 from './pages/Page1.vue';
import Page2 from './pages/Page2.vue';
import Page3 from './pages/Page3.vue';
import Page4 from './pages/Page4.vue';
import Page5 from './pages/Page5.vue';

const store = useAppStore();

const handleKeydown = (e) => {
    if (!e.ctrlKey) return;
    const index = parseInt(e.key, 10);
    if (!Number.isFinite(index)) return;
    if (index >= 1 && index <= store.tabs.length) {
        store.switchTab(store.tabs[index - 1].id);
    }
};

onMounted(() => {
    store.initTheme();
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
#content {
    position: fixed;
    top: var(--titlebar-h);
    left: var(--sidebar-w);
    right: 0;
    bottom: var(--statusbar-h);
    padding: 12px;
    background: radial-gradient(1200px 600px at 20% 0%, rgba(255, 255, 255, 0.03), transparent);
    -webkit-app-region: no-drag;
}

.page {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>
