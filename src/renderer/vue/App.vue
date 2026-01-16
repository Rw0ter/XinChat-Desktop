<template>
    <div class="app-shell" :class="{ 'app-enter': isReady }">
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
                <div class="user-card-wrap">
                    <div
                        class="user-card"
                        @mouseenter="showProfile"
                        @mouseleave="scheduleHideProfile"
                    >
                        <div
                            class="user-avatar user-avatar-trigger"
                            @mouseenter="showProfile"
                        >
                            {{ initials }}
                        </div>
                        <div class="user-meta">
                            <div class="user-name">{{ displayName }}</div>
                            <div class="user-id">UID {{ auth.uid || '---' }}</div>
                        </div>
                    </div>
                    <div
                        class="profile-popover"
                        :class="{ 'is-visible': isProfileVisible }"
                        @mouseenter="showProfile"
                        @mouseleave="hideProfile"
                    >
                        <div class="profile-head">
                            <div class="profile-avatar">{{ initials }}</div>
                            <div class="profile-meta">
                                <div class="profile-name">{{ displayName }}</div>
                                <div class="profile-uid">UID {{ auth.uid || '---' }}</div>
                                <div class="profile-signature">{{ signature }}</div>
                                <div class="profile-details">
                                    <div class="profile-detail">性别：{{ auth.gender || '未设置' }}</div>
                                    <div class="profile-detail">生日：{{ auth.birthday || '未设置' }}</div>
                                    <div class="profile-detail">
                                        地区：{{ auth.country || '未设置' }}{{ auth.province ? ` / ${auth.province}` : '' }}{{ auth.region ? ` / ${auth.region}` : '' }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button class="profile-btn" type="button" @click="openEditProfile">编辑资料</button>
                            <button class="profile-btn ghost" type="button" @click="handleLogout">
                                退出登录
                            </button>
                        </div>
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
            <aside class="icon-rail">
                <div class="rail-section">
                    <button
                        class="rail-btn"
                        :class="{ active: activeView === 'chat' }"
                        title="消息"
                        @click="activeView = 'chat'"
                    >
                        <span class="rail-icon">&#xE8BD;</span>
                        <span class="rail-badge">99+</span>
                    </button>
                    <button
                        class="rail-btn"
                        :class="{ active: activeView === 'contacts' }"
                        title="联系人"
                        @click="openContacts"
                    >
                        <span class="rail-icon">&#xE77B;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="收藏">
                        <span class="rail-icon">&#xE734;</span>
                    </button>
                    <button class="rail-btn" title="探索">
                        <span class="rail-icon">&#xE80F;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="笔记">
                        <span class="rail-icon">&#xE8A5;</span>
                    </button>
                </div>
                <div class="rail-section rail-bottom">
                    <button class="rail-btn" title="邮箱">
                        <span class="rail-icon">&#xE715;</span>
                        <span class="rail-dot"></span>
                    </button>
                    <button class="rail-btn" title="设置">
                        <span class="rail-icon">&#xE713;</span>
                    </button>
                    <button class="rail-btn" title="菜单">
                        <span class="rail-icon">&#xE700;</span>
                    </button>
                </div>
            </aside>
            <aside class="sidebar">
                <div v-if="activeView === 'chat'" class="chat-sidebar">
                    <div class="search">
                        <div class="serach_input_box">
                            <input v-model="searchText" class="serach_input" type="text" placeholder="搜索联系人或群组" />
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
                </div>

                <div v-else class="contacts-sidebar">
                    <div class="contacts-search">
                        <div class="contacts-search-box">
                            <span class="search-icon">&#128269;</span>
                            <input type="text" placeholder="搜索" />
                        </div>
                        <button class="friend-manager-btn" @click="openFoundFriend">
                            <span class="manager-icon">&#xE77B;</span>
                            好友管理器
                        </button>
                    </div>
                    <div class="contacts-section">
                        <button
                            class="contacts-item"
                            :class="{ active: contactsNoticeType === 'friend' }"
                            @click="contactsNoticeType = 'friend'"
                        >
                            <span>好友通知</span>
                            <span class="chev">&#xE76C;</span>
                        </button>
                        <button
                            class="contacts-item"
                            :class="{ active: contactsNoticeType === 'group' }"
                            @click="contactsNoticeType = 'group'"
                        >
                            <span>群通知</span>
                            <span class="badge">2</span>
                            <span class="chev">&#xE76C;</span>
                        </button>
                    </div>
                    <div class="contacts-tabs">
                        <button class="contacts-tab active">好友</button>
                        <button class="contacts-tab">群聊</button>
                    </div>
                    <div class="contacts-list">
                        <button class="contacts-row">
                            <span>我的设备</span>
                            <span class="count">1</span>
                        </button>
                        <button class="contacts-row">
                            <span>机器人</span>
                            <span class="count">1</span>
                        </button>
                        <button class="contacts-row">
                            <span>特别关心</span>
                            <span class="count">1/4</span>
                        </button>
                        <button class="contacts-row">
                            <span>我的好友</span>
                            <span class="count">{{ filteredFriends.length }}/{{ filteredFriends.length }}</span>
                        </button>
                        <button class="contacts-row">
                            <span>朋友</span>
                            <span class="count">0/0</span>
                        </button>
                        <button class="contacts-row">
                            <span>家人</span>
                            <span class="count">0/0</span>
                        </button>
                        <button class="contacts-row">
                            <span>同学</span>
                            <span class="count">0/1</span>
                        </button>
                        <button class="contacts-row">
                            <span>么么哒</span>
                            <span class="count">0/0</span>
                        </button>
                    </div>
                </div>
            </aside>

            <section class="chat">
                <div v-if="activeView === 'chat'" class="chat-panel">
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
                    <div class="chat-actions">
                        <span class="chip">private</span>
                        <span class="chip" :class="{ offline: !activeFriendOnline }">
                            {{ activeFriendOnline ? 'online' : 'offline' }}
                        </span>
                    </div>
                </div>

                    <div class="chat-body" ref="chatBodyRef">
                        <div v-if="loading" class="loading">加载中...</div>
                        <div v-else-if="!messages.length" class="empty-chat">
                            还没有聊天记录，打个招呼吧。
                        </div>
                        <div v-else class="bubble-list">
                            <div
                                v-for="msg in displayMessages"
                                :key="msg.id"
                                class="bubble"
                                :class="{ self: msg.senderUid === auth.uid, error: msg.error }"
                            >
                                <span v-if="msg.error" class="bubble-error-dot"></span>
                                <div class="bubble-name">
                                    {{ msg.senderUid === auth.uid ? displayName : activeFriend?.username }}
                                </div>
                                <div class="bubble-text">{{ renderMessage(msg) }}</div>
                                <div class="bubble-time">{{ formatTime(msg.createdAt) }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="composer">
                        <div class="composer-toolbar">
                            <button class="tool-icon-btn" title="表情">
                                <span class="tool-glyph">&#xE170;</span>
                            </button>
                            <button class="tool-icon-btn" title="剪刀">
                                <span class="tool-glyph">&#xE8C6;</span>
                            </button>
                            <button class="tool-icon-btn" title="文件">
                                <span class="tool-glyph">&#xE8A5;</span>
                            </button>
                            <button class="tool-icon-btn" title="图片">
                                <span class="tool-glyph">&#xEB9F;</span>
                            </button>
                            <button class="tool-icon-btn" title="红包">
                                <span class="tool-glyph">&#xE7C3;</span>
                            </button>
                            <button class="tool-icon-btn" title="语音">
                                <span class="tool-glyph">&#xE720;</span>
                            </button>
                            <div class="tool-spacer"></div>
                            <button class="tool-icon-btn" title="更多">
                                <span class="tool-glyph">&#xE712;</span>
                            </button>
                        </div>
                        <textarea
                            v-model="draft"
                            placeholder=""
                            @keydown.enter.exact.prevent="sendMessage"
                            @keydown.enter.shift.stop
                        ></textarea>
                        <div class="composer-actions">
                            <div class="send-group">
                                <button class="send-btn" :disabled="!canSend" @click="sendMessage">
                                    发送
                                </button>
                                <button class="send-drop" title="发送选项" @click.stop="toggleSendMenu">
                                    <span class="tool-glyph">&#xE70D;</span>
                                </button>
                                <div v-if="showSendMenu" class="send-menu">
                                    <div class="send-menu-item">
                                        <span class="send-tip-mark">&#xE73E;</span>
                                        <span>按 Enter 键发送消息</span>
                                    </div>
                                    <div class="send-menu-item">
                                        <span class="send-tip-mark">&#xE73E;</span>
                                        <span>按 Ctrl + Enter 键发送消息</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="contacts-panel">
                    <div class="contacts-header">
                    <div class="contacts-title">{{ noticeTitle }}</div>
                        <div class="contacts-tools">
                            <button class="tool-btn" title="筛选">
                                <span class="tool-icon">&#xE71C;</span>
                                <span class="tool-dot"></span>
                            </button>
                            <button class="tool-btn" title="清空">
                                <span class="tool-icon">&#xE74D;</span>
                            </button>
                        </div>
                    </div>
                    <div class="contacts-body">
                        <div v-if="!incomingRequests.length && !outgoingRequests.length" class="empty-chat">
                            暂无好友通知
                        </div>
                        <div v-else class="notify-list">
                            <div v-for="req in incomingRequests" :key="`in-${req.uid}`" class="notify-card">
                                <div class="notify-avatar">
                                    <img v-if="req.avatar" :src="req.avatar" alt="avatar" />
                                    <span v-else>{{ req.username.slice(0, 2).toUpperCase() }}</span>
                                </div>
                                <div class="notify-main">
                                    <div class="notify-title">
                                        <span class="notify-name">{{ req.username }}</span>
                                        <span class="notify-text">请求加为好友</span>
                                    </div>
                                    <div class="notify-sub">UID {{ req.uid }}</div>
                                </div>
                                <div class="notify-actions">
                                    <button class="notify-accept" @click="handleRequestAction(req.uid, 'accept')">
                                        同意
                                    </button>
                                    <button class="notify-reject" @click="handleRequestAction(req.uid, 'reject')">
                                        拒绝
                                    </button>
                                </div>
                            </div>
                            <div v-for="req in outgoingRequests" :key="`out-${req.uid}`" class="notify-card">
                                <div class="notify-avatar">
                                    <img v-if="req.avatar" :src="req.avatar" alt="avatar" />
                                    <span v-else>{{ req.username.slice(0, 2).toUpperCase() }}</span>
                                </div>
                                <div class="notify-main">
                                    <div class="notify-title">
                                        <span class="notify-name">{{ req.username }}</span>
                                        <span class="notify-text">等待验证</span>
                                    </div>
                                    <div class="notify-sub">UID {{ req.uid }}</div>
                                </div>
                                <div class="notify-actions">
                                    <span class="notify-status" :class="`status-${req.status}`">
                                        {{ req.status === 'rejected' ? '已拒绝' : '等待验证' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        <div v-if="isEditOpen" class="profile-modal">
            <div class="profile-modal__backdrop" @click="closeEditProfile"></div>
            <div class="profile-modal__panel">
                <div class="profile-modal__header">
                    <div class="profile-modal__title">编辑资料</div>
                    <button class="profile-modal__close" type="button" @click="closeEditProfile">×</button>
                </div>
                <div class="profile-modal__body">
                    <div class="profile-modal__avatar">{{ initials }}</div>

                    <label class="profile-field">
                        <span class="profile-field__label">昵称</span>
                        <div class="profile-field__control">
                            <input
                                v-model.trim="editForm.nickname"
                                type="text"
                                maxlength="36"
                                placeholder="请输入昵称"
                            />
                            <span class="profile-field__count">{{ nicknameCount }}/36</span>
                        </div>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">个签</span>
                        <div class="profile-field__control">
                            <input
                                v-model.trim="editForm.signature"
                                type="text"
                                maxlength="80"
                                placeholder="编辑个签，展示我的独特态度"
                            />
                            <span class="profile-field__count">{{ signatureCount }}/80</span>
                        </div>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">性别</span>
                        <select v-model="editForm.gender">
                            <option value="">请选择</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="保密">保密</option>
                        </select>
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">生日</span>
                        <input v-model="editForm.birthday" type="date" />
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">国家</span>
                        <select v-model="editForm.country">
                            <option value="">请选择</option>
                            <option value="中国">中国</option>
                            <option value="美国">美国</option>
                            <option value="日本">日本</option>
                            <option value="其他">其他</option>
                        </select>
                    </label>

                    <div class="profile-field profile-field--split">
                        <label>
                            <span class="profile-field__label">省份</span>
                            <select v-model="editForm.province">
                                <option value="">请选择</option>
                                <option value="北京">北京</option>
                                <option value="上海">上海</option>
                                <option value="广东">广东</option>
                                <option value="浙江">浙江</option>
                                <option value="其他">其他</option>
                            </select>
                        </label>
                        <label>
                            <span class="profile-field__label">地区</span>
                            <select v-model="editForm.region">
                                <option value="">请选择</option>
                                <option value="华北">华北</option>
                                <option value="华东">华东</option>
                                <option value="华南">华南</option>
                                <option value="西南">西南</option>
                                <option value="其他">其他</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div class="profile-modal__footer">
                    <button class="profile-btn" type="button" @click="saveProfile">保存</button>
                    <button class="profile-btn ghost" type="button" @click="closeEditProfile">取消</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const NOTIFY_SOUND_URL = `${API_BASE}/resource/messagenotify.wav`;

const auth = ref({
    token: '',
    uid: null,
    username: '',
    nickname: '',
    signature: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});
const isReady = ref(false);
const isProfileVisible = ref(false);
const isEditOpen = ref(false);
const friends = ref([]);
const activeFriend = ref(null);
const messages = ref([]);
const localMessages = ref([]);
const chatBodyRef = ref(null);
const draft = ref('');
const loading = ref(false);
const searchText = ref('');
const statusText = ref('在线');
const activeView = ref('chat');
const contactsNoticeType = ref('friend');
const incomingRequests = ref([]);
const outgoingRequests = ref([]);
const showSendMenu = ref(false);
const pollTimers = {
    friends: null,
    messages: null,
    profile: null
    requests: null
};
const lastFriendSignature = ref('');
const lastMessageSignature = ref('');
const lastNotifiedMessageId = ref('');

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();
const openFoundFriend = () => window.electronAPI?.openFoundFriend?.();
let profileHideTimer = null;
const editForm = ref({
    nickname: '',
    signature: '',
    gender: '',
    birthday: '',
    country: '',
    province: '',
    region: ''
});

const handleLogout = () => {
    try {
        localStorage.removeItem('vp_username');
        localStorage.removeItem('vp_signature');
    } catch {}
    if (auth.value.token) {
        fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: authHeader()
        }).catch(() => {});
    }
    window.electronAPI?.logout?.();
};

const openEditProfile = () => {
    editForm.value = {
        nickname: auth.value.nickname || auth.value.username || '',
        signature: auth.value.signature || '',
        gender: auth.value.gender || '',
        birthday: auth.value.birthday || '',
        country: auth.value.country || '',
        province: auth.value.province || '',
        region: auth.value.region || ''
    };
    isEditOpen.value = true;
};

const closeEditProfile = () => {
    isEditOpen.value = false;
};

const saveProfile = async () => {
    if (!auth.value.token) return;
    const payload = {
        nickname: editForm.value.nickname || '',
        signature: editForm.value.signature || '',
        gender: editForm.value.gender || '',
        birthday: editForm.value.birthday || '',
        country: editForm.value.country || '',
        province: editForm.value.province || '',
        region: editForm.value.region || ''
    };
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            auth.value = {
                ...auth.value,
                ...data.user
            };
            try {
                localStorage.setItem('vp_username', auth.value.username || '');
                localStorage.setItem('vp_nickname', auth.value.nickname || '');
                localStorage.setItem('vp_signature', auth.value.signature || '');
            } catch {}
            isEditOpen.value = false;
        }
    } catch {}
};

const showProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = true;
};

const hideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    isProfileVisible.value = false;
};

const scheduleHideProfile = () => {
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
    }
    profileHideTimer = setTimeout(() => {
        isProfileVisible.value = false;
        profileHideTimer = null;
    }, 120);
const openContacts = async () => {
    activeView.value = 'contacts';
    await loadRequests({ silent: true });
};
const toggleSendMenu = () => {
    showSendMenu.value = !showSendMenu.value;
};

const handleDocumentClick = () => {
    if (showSendMenu.value) {
        showSendMenu.value = false;
    }
};

const displayName = computed(() => {
    return auth.value.nickname || auth.value.username || `用户${auth.value.uid || ''}`;
});

const initials = computed(() => {
    const name = auth.value.username || 'ME';
    return name.slice(0, 2).toUpperCase();
});

const signature = computed(() => {
    return auth.value.signature || '这个人很神秘，暂未填写签名';
});

const nicknameCount = computed(() => editForm.value.nickname.length);
const signatureCount = computed(() => editForm.value.signature.length);

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

const activeFriendOnline = computed(() => {
    if (!activeFriend.value) return false;
    return activeFriend.value.online === true;
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

const displayMessages = computed(() => {
    const targetUid = activeFriend.value?.uid;
    const localForTarget = targetUid
        ? localMessages.value.filter((item) => item.targetUid === targetUid)
        : [];
    const combined = [...messages.value, ...localForTarget];
    return combined.slice().sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return aTime - bTime;
    });
});

const noticeTitle = computed(() =>
    contactsNoticeType.value === 'group' ? '群通知' : '好友通知'
);

const loadRequests = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/requests`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            incomingRequests.value = data.incoming || [];
            outgoingRequests.value = data.outgoing || [];
        }
    } catch (err) {
        if (!silent) {
            statusText.value = '好友通知加载失败';
        }
    }
};

const handleRequestAction = async (uid, action) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeader()
            },
            body: JSON.stringify({ requesterUid: uid, action })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            await loadFriends({ silent: true });
            await loadRequests({ silent: true });
        } else {
            statusText.value = data?.message || '处理失败';
        }
    } catch (err) {
        statusText.value = '处理失败';
    }
};

const authHeader = () => {
    if (!auth.value.token) return {};
    return { Authorization: `Bearer ${auth.value.token}` };
};

const playNotifySound = () => {
    try {
        const audio = new Audio(NOTIFY_SOUND_URL);
        audio.play().catch(() => {});
    } catch {}
};

const loadProfile = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            const next = {
                uid: data.user.uid || auth.value.uid,
                username: data.user.username || auth.value.username,
                nickname: data.user.nickname || auth.value.nickname,
                signature: data.user.signature || auth.value.signature,
                gender: data.user.gender || auth.value.gender,
                birthday: data.user.birthday || auth.value.birthday,
                country: data.user.country || auth.value.country,
                province: data.user.province || auth.value.province,
                region: data.user.region || auth.value.region
            };
            const changed = Object.keys(next).some(
                (key) => next[key] !== auth.value[key]
            );
            if (changed) {
                auth.value = {
                    ...auth.value,
                    ...next
                };
                try {
                    localStorage.setItem('vp_username', auth.value.username || '');
                    localStorage.setItem('vp_nickname', auth.value.nickname || '');
                    localStorage.setItem('vp_signature', auth.value.signature || '');
                } catch {}
            }
        }
    } catch (error) {
        if (!silent) {
            console.warn('Profile refresh failed', error);
        }
    }
};
const loadAuth = async () => {
    const info = await window.electronAPI?.getAuthToken?.();
    if (info?.token) {
        auth.value = {
            token: info.token,
            uid: info.uid,
            username: info.username || '',
            nickname: info.nickname || '',
            signature: info.signature || '',
            gender: info.gender || '',
            birthday: info.birthday || '',
            country: info.country || '',
            province: info.province || '',
            region: info.region || ''
        };
    } else {
        const fallback = localStorage.getItem('vp_username');
        const fallbackNickname = localStorage.getItem('vp_nickname');
        const fallbackSignature = localStorage.getItem('vp_signature');
        auth.value = {
            token: '',
            uid: null,
            username: fallback || '',
            nickname: fallbackNickname || '',
            signature: fallbackSignature || '',
            gender: '',
            birthday: '',
            country: '',
            province: '',
            region: ''
        };
    }
};

const buildFriendSignature = (items) => {
    return items
        .map((item) => `${item.uid}-${item.username}-${item.online ? 1 : 0}`)
        .join('|');
};

const buildMessageSignature = (items) => {
    if (!items.length) return '';
    const last = items[items.length - 1];
    return `${items.length}-${last.id}-${last.createdAt}`;
};

const loadFriends = async ({ silent } = {}) => {
    if (!auth.value.token) return;
    try {
        const res = await fetch(`${API_BASE}/api/friends/list`, {
            headers: {
                ...authHeader()
            }
        });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.friends || [];
            const signature = buildFriendSignature(next);
            if (signature !== lastFriendSignature.value) {
                friends.value = next;
                lastFriendSignature.value = signature;
            }
            if (activeFriend.value) {
                const refreshed = next.find((item) => item.uid === activeFriend.value.uid);
                if (refreshed && refreshed !== activeFriend.value) {
                    activeFriend.value = refreshed;
                }
            } else if (friends.value.length) {
                selectFriend(friends.value[0]);
            }
        }
    } catch (err) {
        if (!silent) {
            statusText.value = '好友加载失败';
        }
    }
};

const loadMessages = async (targetUid, { silent } = {}) => {
    if (!auth.value.token || !targetUid) return;
    if (!silent) {
        loading.value = true;
    }
    try {
        const url = `${API_BASE}/api/chat/get?targetType=private&targetUid=${targetUid}`;
        const res = await fetch(url, { headers: authHeader() });
        const data = await res.json();
        if (res.ok && data?.success) {
            const next = data.data || [];
            const signature = buildMessageSignature(next);
            if (signature !== lastMessageSignature.value) {
                const shouldStick = isAtBottom();
                const incoming = next.filter(
                    (msg) => msg.senderUid !== auth.value.uid
                );
                if (incoming.length) {
                    const latestIncoming = incoming[incoming.length - 1];
                    const latestId = latestIncoming.id || latestIncoming.createdAt || '';
                    if (latestId && latestId !== lastNotifiedMessageId.value) {
                        playNotifySound();
                        lastNotifiedMessageId.value = latestId;
                    }
                }
                messages.value = next;
                lastMessageSignature.value = signature;
                if (shouldStick) {
                    await nextTick();
                    scrollToBottom();
                }
            }
        } else {
            if (!silent) {
                messages.value = [];
                lastMessageSignature.value = '';
            }
        }
    } catch (err) {
        if (!silent) {
            messages.value = [];
            lastMessageSignature.value = '';
        }
    } finally {
        if (!silent) {
            loading.value = false;
        }
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
    showSendMenu.value = false;
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localEntry = {
        id: localId,
        type: 'text',
        senderUid: auth.value.uid,
        targetUid: activeFriend.value.uid,
        targetType: 'private',
        data: { content },
        createdAt: new Date().toISOString(),
        pending: true,
        error: false
    };
    localMessages.value = [...localMessages.value, localEntry];
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
            await nextTick();
            scrollToBottom();
            localMessages.value = localMessages.value.filter((item) => item.id !== localId);
        } else {
            localMessages.value = localMessages.value.map((item) =>
                item.id === localId ? { ...item, pending: false, error: true } : item
            );
            statusText.value = data?.message || '发送失败';
        }
    } catch (err) {
        localMessages.value = localMessages.value.map((item) =>
            item.id === localId ? { ...item, pending: false, error: true } : item
        );
        statusText.value = '发送失败';
    }
};

const isAtBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
};

const scrollToBottom = () => {
    const el = chatBodyRef.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
};

onMounted(async () => {
    requestAnimationFrame(() => {
        isReady.value = true;
    });
    await loadAuth();
    await loadProfile();
    await loadFriends();
    await loadRequests();
    window.addEventListener('click', handleDocumentClick);
    pollTimers.friends = setInterval(() => {
        loadFriends({ silent: true });
    }, 3000);
    pollTimers.messages = setInterval(() => {
        if (activeFriend.value?.uid) {
            loadMessages(activeFriend.value.uid, { silent: true });
        }
    }, 1000);
    pollTimers.requests = setInterval(() => {
        if (activeView.value === 'contacts') {
            loadRequests({ silent: true });
        }
    }, 4000);
});

onBeforeUnmount(() => {
    window.removeEventListener('click', handleDocumentClick);
    if (pollTimers.friends) clearInterval(pollTimers.friends);
    if (pollTimers.messages) clearInterval(pollTimers.messages);
    if (pollTimers.profile) clearInterval(pollTimers.profile);
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
    if (pollTimers.requests) clearInterval(pollTimers.requests);
});
</script>

<style scoped>
.app-shell {
    height: 100vh;
    background: radial-gradient(circle at top left, #f5fbff, #eef5ff 45%, #e8f1ff);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transform: translateY(10px) scale(0.985);
    transition: opacity 280ms ease, transform 320ms ease;
}

.app-shell.app-enter {
    opacity: 1;
    transform: translateY(0) scale(1);
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

.user-card-wrap {
    position: relative;
    -webkit-app-region: no-drag;
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
    -webkit-app-region: no-drag;
}

.user-meta {
    display: grid;
    gap: 2px;
}

.profile-popover {
    position: absolute;
    top: 44px;
    right: 0;
    width: 320px;
    height: 360px;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 20px;
    box-shadow: 0 18px 48px rgba(22, 32, 52, 0.16);
    border: 1px solid rgba(31, 65, 120, 0.12);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 180ms ease, transform 220ms ease;
    pointer-events: none;
    z-index: 20;
    -webkit-app-region: no-drag;
}

.profile-popover.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.profile-head {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 18px;
}

.profile-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 16px;
}

.profile-meta {
    display: grid;
    gap: 6px;
}

.profile-name {
    font-size: 18px;
    font-weight: 700;
    color: #1c2436;
}

.profile-uid {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.6);
}

.profile-signature {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.7);
    line-height: 1.4;
}

.profile-details {
    display: grid;
    gap: 4px;
    margin-top: 6px;
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.profile-detail {
    line-height: 1.4;
}

.profile-actions {
    margin-top: auto;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    -webkit-app-region: no-drag;
}

.profile-btn {
    border: none;
    border-radius: 12px;
    padding: 10px 18px;
    background: #1d4ed8;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
}

.profile-btn.ghost {
    background: rgba(29, 78, 216, 0.12);
    color: #1d4ed8;
}

.profile-btn.ghost:hover {
    background: rgba(220, 38, 38, 0.16);
    color: #dc2626;
}

.profile-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
}

.profile-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(4px);
}

.profile-modal__panel {
    position: relative;
    width: 520px;
    max-width: calc(100vw - 32px);
    background: #f7f9ff;
    border-radius: 18px;
    border: 1px solid rgba(31, 65, 120, 0.12);
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
    padding: 20px 22px 18px;
    z-index: 1;
    -webkit-app-region: no-drag;
}

.profile-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.profile-modal__title {
    font-size: 16px;
    font-weight: 700;
    color: #1c2436;
}

.profile-modal__close {
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
}

.profile-modal__body {
    display: grid;
    gap: 12px;
}

.profile-modal__avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 20px;
    margin: 0 auto 6px;
}

.profile-field {
    display: grid;
    gap: 6px;
}

.profile-field__label {
    font-size: 12px;
    color: rgba(28, 36, 54, 0.65);
}

.profile-field__control {
    position: relative;
}

.profile-field__control input {
    width: 100%;
}

.profile-field__count {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: rgba(28, 36, 54, 0.5);
}

.profile-field select,
.profile-field input[type="date"] {
    width: 100%;
}

.profile-field--split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.profile-modal__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
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
    grid-template-columns: 70px 300px 1fr;
    gap: 18px;
    padding: 16px 10px 20px;
    position: relative;
    z-index: 1;
}

.icon-rail {
    border-radius: 28px;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    -webkit-app-region: no-drag;
}

.rail-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
}

.rail-bottom {
    gap: 12px;
}

.rail-btn {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.12);
    color: #1f2937;
    display: grid;
    place-items: center;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s var(--ease), background 0.2s, border 0.2s;
    box-shadow: 0 4px 8px rgba(15, 23, 42, 0.12);
}

.rail-btn:hover {
    transform: translateY(-2px);
    background: rgba(15, 23, 42, 0.12);
    border-color: rgba(15, 23, 42, 0.18);
}

.rail-btn.active {
    background: #2b6cb0;
    border-color: rgba(43, 108, 176, 0.4);
    color: #fff;
    box-shadow: 0 10px 18px rgba(25, 85, 160, 0.35);
}

.rail-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.rail-dot {
    position: absolute;
    right: 8px;
    top: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
}

.rail-badge {
    position: absolute;
    right: -2px;
    top: -6px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #ff5a3c;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    box-shadow: 0 6px 12px rgba(255, 90, 60, 0.35);
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
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 260ms ease 60ms, transform 320ms ease 60ms;
}

.chat-sidebar,
.contacts-sidebar {
    display: flex;
    flex-direction: column;
    gap: 18px;
    height: 100%;
}

.contacts-search {
    display: grid;
    gap: 12px;
}

.contacts-search-box {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    padding: 8px 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    width: 270px;
}

.contacts-search-box input {
    border: none;
    background: transparent;
    font-size: 13px;
}

.contacts-search-box input:focus {
    outline: none;
}

.contacts-add-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    background: rgba(43, 108, 176, 0.2);
    color: #1d4ed8;
    font-weight: 700;
    cursor: pointer;
}

.friend-manager-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(31, 41, 55, 0.08);
    border-radius: 16px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1f2937;
    font-weight: 600;
    cursor: pointer;
    width: 270px;
}

.manager-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
}

.contacts-section {
    display: grid;
    gap: 10px;
}

.contacts-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(17, 24, 39, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.1);
    font-weight: 600;
    cursor: pointer;
}

.contacts-item.active {
    background: rgba(29, 78, 216, 0.16);
    color: #1d4ed8;
}

.contacts-item .badge {
    background: #ff5a3c;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 999px;
    margin-left: 140px;

}

.chev {
    font-family: "Segoe MDL2 Assets";
    font-size: 12px;
    color: #6b7280;
}

.contacts-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: rgba(17, 24, 39, 0.08);
    border-radius: 14px;
    padding: 4px;
    gap: 6px;
}

.contacts-tab {
    border: none;
    background: transparent;
    padding: 8px 0;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
}

.contacts-tab.active {
    background: #1d4ed8;
    color: #fff;
}

.contacts-list {
    display: grid;
    gap: 10px;
    overflow-y: auto;
    padding-right: 4px;
}

.contacts-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(15, 23, 42, 0.08);
    cursor: pointer;
    font-weight: 600;
}

.contacts-row .count {
    color: #6b7280;
    font-weight: 600;
}

.search {
    display: grid;
    gap: 8px;
}

.search-icon {
    color: #64748b;
    font-size: 14px;
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
    height: 70px;
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
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: var(--shadow);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 280ms ease 120ms, transform 360ms ease 120ms;
}

.chat-panel,
.contacts-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
}

.contacts-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.contacts-title {
    font-size: 20px;
    font-weight: 700;
}

.contacts-tools {
    display: flex;
    gap: 12px;
}

.tool-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: none;
    background: rgba(15, 23, 42, 0.08);
    cursor: pointer;
    position: relative;
}

.tool-icon {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    color: #1f2937;
}

.tool-dot {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
}

.contacts-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.9), rgba(255, 255, 255, 0.95));
}

.notify-list {
    display: grid;
    gap: 16px;
}

.notify-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 16px 18px;
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid rgba(72, 147, 214, 0.18);
    color: #1f2937;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.notify-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    background: #1f4c7a;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 600;
}

.notify-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.notify-main {
    display: grid;
    gap: 6px;
}

.notify-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
}

.notify-name {
    color: #2563eb;
}

.notify-text {
    color: #1f2937;
}

.notify-sub {
    font-size: 12px;
    color: #6b7280;
}

.notify-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notify-accept,
.notify-reject {
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(15, 23, 42, 0.06);
    color: #1f2937;
    padding: 6px 14px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
}

.notify-accept {
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
}

.notify-status {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
}

.notify-status.status-rejected {
    color: #f87171;
}

.chat-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.app-shell.app-enter .sidebar,
.app-shell.app-enter .chat {
    opacity: 1;
    transform: translateY(0);
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

.chip.offline {
    background: rgba(148, 163, 184, 0.2);
    color: #64748b;
}

.chat-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    background: linear-gradient(180deg, rgba(243, 248, 255, 0.8), rgba(255, 255, 255, 0.95));
}

.bubble-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.bubble {
    max-width: 50%;
    width: fit-content;
    padding: 12px 14px;
    border-radius: 16px;
    background: #f3f7ff;
    box-shadow: 0 8px 18px rgba(27, 28, 32, 0.08);
    display: grid;
    gap: 6px;
    position: relative;
}

.bubble.self {
    align-self: flex-end;
    background: #2b6cb0;
    color: #fff;
}

.bubble.error {
    border: 1px solid rgba(255, 90, 60, 0.4);
}

.bubble-error-dot {
    position: absolute;
    left: -8px;
    top: 10px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff5a3c;
    box-shadow: 0 0 0 3px rgba(255, 90, 60, 0.2);
}

.bubble-name {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.7;
}

.bubble-text {
    font-size: 14px;
    line-height: 1.5;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
    white-space: pre-wrap;
    word-break: break-word;
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
    gap: 12px;
    flex: 0 0 auto;
}

.composer-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px 2px;
}

.tool-icon-btn {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: #4b5563;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.2s, border 0.2s, color 0.2s;
}

.tool-icon-btn:hover {
    background: rgba(15, 23, 42, 0.06);
    border-color: rgba(15, 23, 42, 0.12);
    color: #1f2937;
}

.tool-glyph {
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.tool-spacer {
    flex: 1;
}

.composer textarea {
    min-height: 70px;
    resize: none;
    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
    border-radius: 12px;
    border: unset;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.9);
    outline: none;
}

.composer textarea::-webkit-scrollbar {
    display: none;
}
   


.composer textarea:focus {
    box-shadow: unset;
}


.composer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
}

.send-tip-mark {
    font-family: "Segoe MDL2 Assets";
    font-size: 14px;
    color: #1d4ed8;
}

.send-group {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-radius: 14px;
    overflow: visible;
    box-shadow: 0 10px 18px rgba(72, 147, 214, 0.25);
    position: relative;
}

.send-btn {
    border: none;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s var(--ease);
    padding: 10px 22px;
    background: transparent;
}

.send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.send-btn:not(:disabled):hover {
    transform: translateY(-2px);
}

.send-drop {
    width: 36px;
    height: 100%;
    border: none;
        background: unset;
    color: #fff;
    cursor: pointer;
    display: grid;
    place-items: center;
}

.send-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 18px 30px rgba(15, 23, 42, 0.16);
    padding: 8px 10px;
    display: grid;
    gap: 6px;
    min-width: 220px;
    z-index: 5;
}

.send-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #374151;
    padding: 6px 8px;
    border-radius: 8px;
}

.send-menu-item:hover {
    background: rgba(15, 23, 42, 0.06);
}

.loading,
.empty-chat {
    font-size: 13px;
    color: var(--ink-soft);
    text-align: center;
}

.contacts-panel .empty-chat {
    color: #64748b;
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
