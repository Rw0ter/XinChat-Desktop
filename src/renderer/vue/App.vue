<template>
    <div class="app-shell">
        <header class="topbar">
            <div class="brand">
                <div class="brand-mark">R</div>
                <div>
                    <div class="brand-title">信聊 · dgitc</div>
                    <div class="brand-sub">即时消息 · 简约工作流</div>
                </div>
            </div>
            <div class="topbar-center">
                <div class="status-pill">{{ statusText }}</div>
            </div>
            <div class="topbar-right">
                <div class="user-card">
                    <div class="user-avatar">{{ initials }}</div>
                    <div class="user-meta">
                        <div class="user-name">{{ displayName }}</div>
                        <div class="user-id">UID {{ auth.uid || '---' }}</div>
                    </div>
                </div>
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
            </div>
        </header>

        <main class="layout">
            <aside class="sidebar">
                <div class="search">
                    <div class="serach_input_box">
                        <input v-model="searchText"  class="serach_input" type="text" placeholder="搜索联系人或群组" />
                        <div class="add_friend_icon" @click="openFoundFriend">+</div>
                    </div>
                    
                    <div class="search-hint">好友 {{ filteredFriends.length }}</div>
                </div>
                <div class="list">
                    <div class="section-title">私聊列表</div>
                    <button
                        v-for="friend in filteredFriends"
                        :key="friend.uid"
                        class="list-item"
                        :class="{ active: activeFriend?.uid === friend.uid }"
                        @click="selectFriend(friend)"
                    >
                        <div class="avatar">{{ friend.username?.slice(0, 2).toUpperCase() }}</div>
                        <div class="list-meta">
                            <div class="list-name">{{ friend.username }}</div>
                            <div class="list-sub">UID {{ friend.uid }}</div>
                        </div>
                    </button>
                    <div v-if="!filteredFriends.length" class="empty-state">
                        暂无好友，请先添加好友。
                    </div>
                </div>
            </aside>

            <section class="chat">
                <div class="chat-header">
                    <div>
                        <div class="chat-title">
                            {{ activeFriend?.username || '选择一个联系人' }}
                        </div>
                        <div class="chat-sub">
                            {{ activeFriend ? `私聊 · UID ${activeFriend.uid}` : '等待选择聊天对象' }}
                        </div>
                    </div>
                    <div class="chat-actions">
                        <span class="chip">private</span>
                        <span class="chip">online</span>
                    </div>
                </div>

                <div class="chat-body">
                    <div v-if="loading" class="loading">加载中...</div>
                    <div v-else-if="!messages.length" class="empty-chat">
                        还没有聊天记录，打个招呼吧。
                    </div>
                    <div v-else class="bubble-list">
                        <div
                            v-for="msg in messages"
                            :key="msg.id"
                            class="bubble"
                            :class="{ self: msg.senderUid === auth.uid }"
                        >
                            <div class="bubble-name">
                                {{ msg.senderUid === auth.uid ? displayName : activeFriend?.username }}
                            </div>
                            <div class="bubble-text">{{ renderMessage(msg) }}</div>
                            <div class="bubble-time">{{ formatTime(msg.createdAt) }}</div>
                        </div>
                    </div>
                </div>

                <div class="composer">
                    <textarea
                        v-model="draft"
                        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                        @keydown.enter.exact.prevent="sendMessage"
                        @keydown.enter.shift.stop
                    ></textarea>
                    <button class="send-btn" :disabled="!canSend" @click="sendMessage">
                        发送
                    </button>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const auth = ref({ token: '', uid: null, username: '' });
const friends = ref([]);
const activeFriend = ref(null);
const messages = ref([]);
const draft = ref('');
const loading = ref(false);
const searchText = ref('');
const statusText = ref('在线');

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();
const openFoundFriend = () => window.electronAPI?.openFoundFriend?.();

const displayName = computed(() => {
    return auth.value.username || `用户${auth.value.uid || ''}`;
});

const initials = computed(() => {
    const name = auth.value.username || 'ME';
    return name.slice(0, 2).toUpperCase();
});

const filteredFriends = computed(() => {
    const query = searchText.value.trim().toLowerCase();
    if (!query) return friends.value;
    return friends.value.filter(
        (item) =>
            item.username?.toLowerCase().includes(query) ||
            String(item.uid).includes(query)
    );
});

const canSend = computed(() => {
    return (
        !!auth.value.token &&
        !!activeFriend.value?.uid &&
        draft.value.trim().length > 0
    );
});

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const renderMessage = (msg) => {
    if (msg.type === 'text') {
        return msg.data?.content || '';
    }
    if (msg.type === 'image') return '[图片消息]';
    if (msg.type === 'video') return '[视频消息]';
    if (msg.type === 'voice') return '[语音消息]';
    if (msg.type === 'gif') return '[GIF 表情]';
    return '[未知消息]';
};

const authHeader = () => {
    if (!auth.value.token) return {};
    return { Authorization: `Bearer ${auth.value.token}` };
};

const loadAuth = async () => {
    const info = await window.electronAPI?.getAuthToken?.();
    if (info?.token) {
        auth.value = {
            token: info.token,
            uid: info.uid,
            username: info.username || ''
        };
    } else {
        const fallback = localStorage.getItem('vp_username');
        auth.value = { token: '', uid: null, username: fallback || '' };
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
            if (!activeFriend.value && friends.value.length) {
                selectFriend(friends.value[0]);
            }
        }
    } catch (err) {
        statusText.value = '好友加载失败';
    }
};

const loadMessages = async (targetUid) => {
    if (!auth.value.token || !targetUid) return;
    loading.value = true;
    try {
        const url = `${API_BASE}/api/chat/get?targetType=private&targetUid=${targetUid}`;
        const res = await fetch(url, { headers: authHeader() });
        const data = await res.json();
        if (res.ok && data?.success) {
            messages.value = data.data || [];
        } else {
            messages.value = [];
        }
    } catch (err) {
        messages.value = [];
    } finally {
        loading.value = false;
    }
};

const selectFriend = (friend) => {
    activeFriend.value = friend;
    loadMessages(friend.uid);
};

const sendMessage = async () => {
    if (!canSend.value) return;
    const content = draft.value.trim();
    if (!content) return;
    try {
        const res = await fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({
                senderUid: auth.value.uid,
                targetUid: activeFriend.value.uid,
                targetType: 'private',
                type: 'text',
                content
            })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            messages.value = [...messages.value, data.data];
            draft.value = '';
        }
    } catch (err) {
        statusText.value = '发送失败';
    }
};

onMounted(async () => {
    await loadAuth();
    await loadFriends();
});
</script>

<style scoped>
.app-shell {
    height: 100vh;
    background: radial-gradient(circle at top left, #f5fbff, #eef5ff 45%, #e8f1ff);
    position: relative;
    overflow: hidden;
}

.app-shell::before,
.app-shell::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(0px);
    opacity: 0.7;
}

.app-shell::before {
    width: 380px;
    height: 380px;
    background: rgba(59, 213, 255, 0.18);
    top: -120px;
    right: -60px;
}

.app-shell::after {
    width: 520px;
    height: 520px;
    background: rgba(72, 147, 214, 0.16);
    bottom: -220px;
    left: -120px;
}

.topbar {
    height: var(--titlebar-h);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 18px;
    position: relative;
    z-index: 2;
    -webkit-app-region: drag;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-weight: 700;
    display: grid;
    place-items: center;
    box-shadow: var(--shadow);
    font-size: 16px;
}

.brand-title {
    font-weight: 700;
    font-size: 14px;
}

.brand-sub {
    font-size: 11px;
    color: var(--ink-soft);
}

.topbar-center {
    display: flex;
    justify-content: center;
}

.status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.14);
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.topbar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
}

.user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: #1f4c7a;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    display: grid;
    place-items: center;
}

.user-meta {
    display: grid;
    gap: 2px;
}

.user-name {
    font-size: 12px;
    font-weight: 600;
}

.user-id {
    font-size: 10px;
    color: var(--ink-soft);
}

.window-controls {
    display: flex;
    -webkit-app-region: no-drag;
}

.wc-btn {
    width: 40px;
    height: 28px;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s;
}

.wc-btn:hover {
    background: rgba(27, 28, 32, 0.08);
}

.wc-btn.close:hover {
    background: #d04732;
    color: #fff;
}

.wc-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 9px;
}

.layout {
    height: calc(100vh - var(--titlebar-h));
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 18px;
    padding: 16px 20px 20px;
    position: relative;
    z-index: 1;
}

.sidebar {
    background: var(--panel-soft);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: var(--shadow);
}

.search {
    display: grid;
    gap: 8px;
}

.search-hint {
    font-size: 11px;
    color: var(--ink-soft);
    text-align: right;
}

.list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    height: 4vh;
}

.list-item {
    display: grid;
    grid-template-columns: 42px 1fr;
    gap: 12px;
    align-items: center;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 10px;
    background: #fff;
    transition: transform 0.2s var(--ease), border 0.2s;
    cursor: pointer;
    width: 100%;
    height: 12vh;
}

.list-item:hover {
    transform: translateY(-2px);
    border-color: rgba(72, 147, 214, 0.5);
}

.list-item.active {
    border-color: rgba(72, 147, 214, 0.6);
    box-shadow: 0 12px 20px rgba(72, 147, 214, 0.18);
}

.avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: #1f4c7a;
    color: #fff;
    font-weight: 600;
    display: grid;
    place-items: center;
    font-size: 13px;
}

.list-meta {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.list-name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.list-sub {
    font-size: 12px;
    color: var(--ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-state {
    font-size: 12px;
    color: var(--ink-soft);
    text-align: center;
    padding: 20px 0;
}

.chat {
    background: var(--panel);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    display: grid;
    grid-template-rows: auto 1fr auto;
    box-shadow: var(--shadow);
}

.chat-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.chat-title {
    font-size: 18px;
    font-weight: 700;
}

.chat-sub {
    font-size: 12px;
    color: var(--ink-soft);
}

.chat-actions {
    display: flex;
    gap: 8px;
}

.chip {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.16);
    color: #1d4ed8;
}

.chat-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.8), rgba(255, 255, 255, 0.95));
}

.bubble-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.bubble {
    max-width: 70%;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f3f7ff;
    box-shadow: 0 8px 18px rgba(27, 28, 32, 0.08);
    display: grid;
    gap: 6px;
}

.bubble.self {
    align-self: flex-end;
    background: #2b6cb0;
    color: #fff;
}

.bubble-name {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
}

.bubble-text {
    font-size: 14px;
    line-height: 1.5;
}

.serach_input_box{
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}


.bubble-time {
    font-size: 10px;
    opacity: 0.6;
    text-align: right;
}

.composer {
    padding: 16px 22px 18px;
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 12px;
}

.composer textarea {
    min-height: 70px;
    resize: none;
    font-family: "JetBrains Mono", monospace;
}

.send-btn {
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s var(--ease);
}

.send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.send-btn:not(:disabled):hover {
    transform: translateY(-2px);
}

.loading,
.empty-chat {
    font-size: 13px;
    color: var(--ink-soft);
    text-align: center;
}

.serach_input{
    width: 80%;
     border-radius: 8px;
}


.add_friend_icon{
    width: 46px;
    height: 46px;
    border-radius: 8px;
    cursor: pointer;
    margin: 5px;
        margin-left: 10px;
    color: #1d4ed8;
    background-color: #eaf2ff;
    border: 1px solid rgba(72, 147, 214, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
