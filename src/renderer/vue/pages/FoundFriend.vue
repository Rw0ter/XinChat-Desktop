<template>
    <div class="found-shell">
        <header class="found-header">
            <div class="title">综合搜索</div>
            <div class="window-controls">
                <button class="wc-btn" @click="handleMin" title="最小化">
                    <span class="wc-icon">&#xE921;</span>
                </button>
                <button class="wc-btn" @click="handleMax" title="最大化">
                    <span class="wc-icon">&#xE922;</span>
                </button>
                <button class="wc-btn close" @click="handleClose" title="关闭">
                    <span class="wc-icon">&#xE8BB;</span>
                </button>
            </div>
        </header>

        <section class="search-area">
            <div class="search-bar">
                <span class="search-icon">&#128269;</span>
                <input
                    v-model.trim="query"
                    type="text"
                    placeholder="输入好友 UID"
                    @keydown.enter.prevent="handleSearch"
                />
                <button class="search-btn" @click="handleSearch" :disabled="loading">
                    搜索
                </button>
            </div>
            <div class="tabs">
                <button
                    v-for="tab in tabs"
                    :key="tab"
                    class="tab"
                    :class="{ active: activeTab === tab }"
                    @click="activeTab = tab"
                >
                    {{ tab }}
                </button>
            </div>
        </section>

        <section class="tags">
            <span class="tag" v-for="tag in tags" :key="tag">{{ tag }}</span>
        </section>

        <section class="result-area">
            <div v-if="status" class="status">{{ status }}</div>
            <div v-if="result" class="result-card">
                <div class="avatar">
                    <img v-if="result.avatar" :src="result.avatar" alt="avatar" />
                    <span v-else>{{ result.username.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div class="result-meta">
                    <div class="result-name">{{ result.username }}</div>
                    <div class="result-sub">UID {{ result.uid }}</div>
                </div>
                <button
                    class="add-btn"
                    @click="handleAddFriend"
                    :disabled="adding || requestState === 'added'"
                >
                    {{
                        requestState === 'added'
                            ? '已添加'
                            : adding
                            ? '申请中...'
                            : '申请'
                    }}
                </button>
            </div>
            <div v-if="!result && !status" class="empty">暂无搜索结果</div>
        </section>

    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const query = ref('');
const result = ref(null);
const status = ref('');
const loading = ref(false);
const adding = ref(false);
const activeTab = ref('全部');
const tabs = ['全部', '用户', '群聊', '小程序', '机器人'];
const tags = ['推荐', '游戏', '动漫', '学习', '音乐', '影视', '运动'];

const auth = ref({ token: '', uid: null });
const friends = ref([]);

const authHeader = () => {
    if (!auth.value.token) return {};
    return { Authorization: `Bearer ${auth.value.token}` };
};

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();

const loadAuth = async () => {
    const info = await window.electronAPI?.getAuthToken?.();
    if (info?.token) {
        auth.value = { token: info.token, uid: info.uid };
    }
};

const loadFriends = async () => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/list`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            friends.value = data.friends || [];
        }
    } catch (err) {
        status.value = '好友列表获取失败。';
    }
};

const isAdded = computed(() => {
    if (!result.value) return false;
    return friends.value.some((item) => item.uid === result.value.uid);
});

const requestState = computed(() => {
    if (!result.value) return 'none';
    if (isAdded.value) return 'added';
    return 'none';
});

const handleSearch = async () => {
    if (!auth.value.token) {
        status.value = '请先登录后再搜索。';
        result.value = null;
        return;
    }
    const uid = Number(query.value.trim());
    if (!Number.isInteger(uid)) {
        status.value = '请输入有效的 UID。';
        result.value = null;
        return;
    }
    status.value = '';
    loading.value = true;
    result.value = null;
    try {
        const res = await fetch(`${API_BASE}/api/friends/search?uid=${uid}`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            result.value = data.user;
            status.value = '';
        } else {
            status.value = data?.message || '未找到用户。';
        }
    } catch (err) {
        status.value = '搜索失败，请稍后再试。';
    } finally {
        loading.value = false;
    }
};

const handleAddFriend = async () => {
    if (!result.value) return;
    adding.value = true;
    status.value = '';
    try {
        const res = await fetch(`${API_BASE}/api/friends/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({ friendUid: result.value.uid })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            if (data.status === 'accepted') {
                status.value = '已同意并成为好友。';
                await loadFriends();
            } else {
                status.value = '已发送好友申请，等待对方同意。';
            }
        } else {
            status.value = data?.message || '添加失败。';
        }
    } catch (err) {
        status.value = '添加失败，请稍后再试。';
    } finally {
        adding.value = false;
    }
};

onMounted(async () => {
    await loadAuth();
    await loadFriends();
});
</script>

<style scoped>
.found-shell {
    min-height: 100vh;
    background: linear-gradient(180deg, #f5fbff 0%, #eef5ff 100%);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    padding: 18px 24px 28px;
    gap: 16px;
}

.found-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px;
    -webkit-app-region: drag;
}

.title {
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.04em;
}

.window-controls {
    display: flex;
    gap: 4px;
    -webkit-app-region: no-drag;
}

.wc-btn {
    width: 36px;
    height: 28px;
    border: none;
    background: transparent;
    color: #1d4ed8;
    border-radius: 8px;
    cursor: pointer;
}

.wc-btn:hover {
    background: rgba(72, 147, 214, 0.15);
}

.wc-btn.close:hover {
    background: #d04732;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 9px;
}

.search-area {
    background: #ffffff;
    border-radius: 18px;
    padding: 18px;
    box-shadow: var(--shadow);
    border: 1px solid rgba(72, 147, 214, 0.18);
}

.search-bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    background: #f3f8ff;
    border-radius: 14px;
    padding: 8px 12px;
}

.search-icon {
    color: #3b82f6;
    font-size: 16px;
}

.search-bar input {
    border: none;
    background: transparent;
    font-size: 14px;
    -webkit-app-region: no-drag;
}

.search-bar input:focus {
    outline: none;
    box-shadow: none;
}

.search-btn {
    background: linear-gradient(135deg, #4893d6, #3bd5ff);
    border: none;
    color: white;
    padding: 8px 18px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.search-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.tabs {
    margin-top: 14px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.tab {
    border: none;
    background: transparent;
    color: #4b5563;
    font-weight: 600;
    padding: 6px 10px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    -webkit-app-region: no-drag;
}

.tab.active {
    color: #1d4ed8;
    border-color: #4893d6;
}

.tags {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding: 6px 2px;
}

.tag {
    background: #eaf2ff;
    color: #2563eb;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 600;
}

.result-area {
    background: #ffffff;
    border-radius: 18px;
    padding: 18px;
    border: 1px solid rgba(72, 147, 214, 0.18);
    box-shadow: var(--shadow);
    flex: 1;
}

.status {
    font-size: 13px;
    color: #1d4ed8;
    padding: 6px 0 12px;
}

.result-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 14px;
    border-radius: 16px;
    background: #f7fbff;
    border: 1px solid rgba(72, 147, 214, 0.2);
}

.avatar {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 600;
    overflow: hidden;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.result-meta {
    display: grid;
    gap: 4px;
}

.result-name {
    font-size: 16px;
    font-weight: 700;
}

.result-sub {
    font-size: 12px;
    color: #6b7280;
}

.add-btn {
    background: #1d4ed8;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.add-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
}

.empty {
    color: #6b7280;
    font-size: 13px;
    padding: 12px 0;
}
</style>
