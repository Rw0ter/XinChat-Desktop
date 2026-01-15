import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export const useAppStore = defineStore('app', () => {
    // 状态
    const theme = ref('dark');
    const activeTab = ref('list1');
    const status = ref('就绪');

    // 标签数据
    const tabs = [
        { id: 'list1', label: '选项卡 1', icon: '&#xE703;' },
        { id: 'list2', label: '选项卡 2', icon: '&#xE8D2;' },
        { id: 'list3', label: '选项卡 3', icon: '&#xE7BA;' },
        { id: 'list4', label: '选项卡 4', icon: '&#xE946;' },
        { id: 'list5', label: '主题', icon: '&#xE706;' },
    ];

    // 计算属性
    const activeLabel = computed(() => {
        return tabs.find((t) => t.id === activeTab.value)?.label ?? activeTab.value;
    });

    // 方法
    const setStatus = (text, timeout = 1200) => {
        status.value = text;
        if (timeout) {
            setTimeout(() => {
                status.value = '就绪';
            }, timeout);
        }
    };

    const switchTab = (tabId) => {
        if (tabId === activeTab.value) return;
        activeTab.value = tabId;
        const label = tabs.find((t) => t.id === tabId)?.label ?? tabId;
        setStatus(`已切换：${label}`, 900);
    };

    const toggleTheme = () => {
        theme.value = theme.value === 'dark' ? 'light' : 'dark';
    };

    const setTheme = (newTheme) => {
        if (newTheme === 'dark' || newTheme === 'light') {
            theme.value = newTheme;
        }
    };

    // 监听主题变化并应用到 DOM
    watch(
        theme,
        (newTheme) => {
            document.documentElement.setAttribute('data-theme', newTheme);
            try {
                localStorage.setItem('vp_theme', newTheme);
            } catch {}
        },
        { immediate: true }
    );

    // 初始化主题
    const initTheme = () => {
        try {
            const saved = localStorage.getItem('vp_theme');
            if (saved === 'dark' || saved === 'light') {
                theme.value = saved;
            }
        } catch {}
    };

    return {
        theme,
        activeTab,
        status,
        tabs,
        activeLabel,
        setStatus,
        switchTab,
        toggleTheme,
        setTheme,
        initTheme,
    };
});
