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
                <div class="topbar-right-controls">
                    <div class="topbar-right-spacer"></div>
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
                                            城市：{{ auth.country || '未设置' }}{{ auth.province ? ` / ${auth.province}` : '' }}{{ auth.region ? ` / ${auth.region}` : '' }}
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
                <template v-if="activeView === 'chat'">
                    <div class="chat-panel">
                        <div class="chat-header">
                            <div>
                                <div
                                    class="chat-title"
                                    :class="{ clickable: activeFriend }"
                                    @click.stop="toggleFriendProfile"
                                >
                                    {{ activeFriend?.username || '选择一个联系人' }}
                                </div>
                                <div class="chat-sub">
                                    {{ activeFriend ? `私聊 · UID ${activeFriend.uid}` : '等待选择聊天对象' }}
                                </div>
                            </div>
                            <div class="chat-actions">
                                <span class="chip">private</span>
                                <span class="chip" :class="{ offline: !activeFriendOnline }">
                                    {{ activeFriendOnline ? 'online' : 'offline' }}
                                </span>
                            </div>
                            <div
                                v-if="activeFriend"
                                ref="friendProfileRef"
                                class="friend-profile-popover"
                                :class="{ 'is-visible': isFriendProfileVisible }"
                                @click.stop
                            >
                                <div class="profile-head">
                                    <div class="profile-avatar">{{ friendInitials }}</div>
                                    <div class="profile-meta">
                                        <div class="profile-name">{{ friendDisplayName }}</div>
                                        <div class="profile-uid">UID {{ friendProfileSource?.uid || '---' }}</div>
                                        <div class="profile-signature">{{ friendSignature }}</div>
                                        <div class="profile-details">
                                            <div class="profile-detail">性别：{{ friendProfileSource?.gender || '未设置' }}</div>
                                            <div class="profile-detail">生日：{{ friendProfileSource?.birthday || '未设置' }}</div>
                                            <div class="profile-detail">
                                                城市：{{ friendProfileSource?.country || '未设置' }}{{ friendProfileSource?.province ? ` / ${friendProfileSource?.province}` : '' }}{{ friendProfileSource?.region ? ` / ${friendProfileSource?.region}` : '' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                   
                    </div>

                   

                    <div class="composer">
                        <div class="composer-toolbar">
                            <button
                                ref="emojiButtonRef"
                                class="tool-icon-btn"
                                :class="{ 'is-active': showEmojiPicker }"
                                title="表情"
                                @click.stop="toggleEmojiPicker"
                            >
                                <span class="tool-glyph">&#xE170;</span>
                            </button>
                            <div
                                v-if="showEmojiPicker"
                                ref="emojiPickerRef"
                                class="emoji-panel"
                                @click.stop
                            >
                                <div class="emoji-tabs">
                                    <button
                                        v-for="tab in emojiTabs"
                                        :key="tab.id"
                                        class="emoji-tab"
                                        :class="{ active: emojiTab === tab.id }"
                                        type="button"
                                        @click="emojiTab = tab.id"
                                    >
                                        {{ tab.label }}
                                    </button>
                                </div>
                                <div v-if="currentEmojiList.length" class="emoji-grid">
                                    <button
                                        v-for="item in currentEmojiList"
                                        :key="`${emojiTab}-${item}`"
                                        class="emoji-btn"
                                        type="button"
                                        @click="addEmoji(item)"
                                    >
                                        {{ item }}
                                    </button>
                                </div>
                                <div v-else class="emoji-empty">暂无表情</div>
                            </div>
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
                            ref="composerTextareaRef"
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
                </template>

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
        <transition name="profile-modal" appear>
            <div v-show="isEditOpen" class="profile-modal">
                <div class="profile-modal__backdrop" @click="closeEditProfile"></div>
                <div class="profile-modal__panel">
                    <div class="profile-modal__header">
                        <div class="profile-modal__title">编辑资料</div>
                        <button class="profile-modal__close" type="button" @click="closeEditProfile">×</button>
                    </div>
                    <div class="profile-modal__body">
                        <div class="profile-modal__avatar">{{ initials }}</div>

                    <label class="profile-field" :class="{ 'is-invalid': nicknameInvalid }">
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
                        <SelectField
                            v-model="editForm.gender"
                            :options="genderOptions"
                            autoScroll
                        />
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">生日</span>
                        <DateSelect v-model="editForm.birthday" />
                    </label>

                    <label class="profile-field">
                        <span class="profile-field__label">国家</span>
                        <SelectField
                            v-model="editForm.country"
                            :options="countryOptions"
                            autoScroll
                        />
                    </label>

                    <div
                        v-if="editForm.country === '中国'"
                        class="profile-field profile-field--split"
                    >
                        <label>
                            <span class="profile-field__label">省份</span>
                        <SelectField
                            v-model="editForm.province"
                            :options="provinceOptions"
                            autoScroll
                        />
                        </label>
                        <label>
                            <span class="profile-field__label">城市</span>
                            <SelectField
                                v-model="editForm.region"
                                :options="cityOptions"
                                :disabled="!cityOptions.length"
                                autoScroll
                            />
                        </label>
                    </div>
                    </div>
                    <div class="profile-modal__footer">
                        <button class="profile-btn" type="button" @click="saveProfile">保存</button>
                        <button class="profile-btn ghost" type="button" @click="closeEditProfile">取消</button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue';
import SelectField from './components/SelectField.vue';
import DateSelect from './components/DateSelect.vue';
import { COUNTRIES, CHINA_PROVINCES, CHINA_CITIES_BY_PROVINCE } from './utils/geo';
import { API_BASE } from './utils/api.js';
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
const nicknameInvalid = ref(false);
const friends = ref([]);
const activeFriend = ref(null);
const messages = ref([]);
const localMessages = ref([]);
const chatBodyRef = ref(null);
const wsRef = ref(null);
const draft = ref('');
const loading = ref(false);
const searchText = ref('');
const statusText = ref('在线');
const activeView = ref('chat');
const contactsNoticeType = ref('friend');
const incomingRequests = ref([]);
const outgoingRequests = ref([]);
const showSendMenu = ref(false);
const showEmojiPicker = ref(false);
const emojiTab = ref('recent');
const recentEmojis = ref([]);
const isFriendProfileVisible = ref(false);
const friendProfileRef = ref(null);
const friendProfile = ref(null);
const friendProfileLoading = ref(false);
const emojiPickerRef = ref(null);
const emojiButtonRef = ref(null);
const composerTextareaRef = ref(null);
let wsReconnectTimer = null;
let wsReconnectAttempts = 0;
let wsHeartbeatTimer = null;
const HEARTBEAT_INTERVAL_MS = 15000;
let wsPresenceTimer = null;
const PRESENCE_REQUEST_INTERVAL_MS = 10000;
const presenceOverrides = new Map();
let messageIdSet = new Set();
const lastFriendSignature = ref('');
const lastMessageSignature = ref('');

const handleMin = () => window.electronAPI?.windowMin?.();
const handleMax = () => window.electronAPI?.windowMax?.();
const handleClose = () => window.electronAPI?.windowClose?.();
const openFoundFriend = () => window.electronAPI?.openFoundFriend?.();
const flashWindow = () => window.electronAPI?.windowFlash?.();
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
const genderOptions = ['男', '女', '保密'];
const countryOptions = COUNTRIES;
const provinceOptions = computed(() => {
    return editForm.value.country === '中国' ? CHINA_PROVINCES : [];
});
const cityOptions = computed(() => {
    if (editForm.value.country !== '中国') return [];
    return CHINA_CITIES_BY_PROVINCE[editForm.value.province] || [];
});

const handleLogout = () => {
    try {
        localStorage.removeItem('vp_username');
        localStorage.removeItem('vp_signature');
    } catch {}
    closeWebSocket();
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
    nicknameInvalid.value = false;
    isEditOpen.value = true;
};

const closeEditProfile = () => {
    isEditOpen.value = false;
    nicknameInvalid.value = false;
};

const saveProfile = async () => {
    if (!auth.value.token) return;
    const nickname = sanitizeText(editForm.value.nickname).trim();
    if (!nickname) {
        statusText.value = '昵称为必填项';
        nicknameInvalid.value = true;
        return;
    }
    nicknameInvalid.value = false;
    const payload = {
        nickname,
        signature: sanitizeText(editForm.value.signature).trim(),
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
};

watch(
    () => editForm.value.province,
    (next, prev) => {
        if (next !== prev) {
            editForm.value.region = '';
        }
    }
);

watch(
    () => activeFriend.value?.uid,
    () => {
        isFriendProfileVisible.value = false;
        friendProfile.value = null;
    }
);
const buildWsUrl = () => {
    const base = new URL(API_BASE);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = '/ws';
    base.searchParams.set('token', auth.value.token || '');
    return base.toString();
};

const closeWebSocket = () => {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
    if (wsHeartbeatTimer) {
        clearInterval(wsHeartbeatTimer);
        wsHeartbeatTimer = null;
    }
    if (wsPresenceTimer) {
        clearInterval(wsPresenceTimer);
        wsPresenceTimer = null;
    }
    if (wsRef.value) {
        wsRef.value.onopen = null;
        wsRef.value.onclose = null;
        wsRef.value.onmessage = null;
        wsRef.value.onerror = null;
        wsRef.value.close();
        wsRef.value = null;
    }
};

const scheduleReconnect = () => {
    if (wsReconnectTimer || !auth.value.token) {
        return;
    }
    const delay = Math.min(1000 * 2 ** wsReconnectAttempts, 15000);
    wsReconnectAttempts += 1;
    wsReconnectTimer = setTimeout(() => {
        wsReconnectTimer = null;
        connectWebSocket();
    }, delay);
};

const handleWsMessage = (payload) => {
    let message = null;
    try {
        message = JSON.parse(payload);
    } catch {
        return;
    }
    if (!message?.type) {
        return;
    }
    if (message.type === 'friends') {
        loadFriends({ silent: true });
        return;
    }
    if (message.type === 'requests') {
        loadRequests({ silent: true });
        loadFriends({ silent: true });
        return;
    }
    if (message.type === 'presence' && message.data) {
        applyPresenceUpdate(message.data);
        return;
    }
    if (message.type === 'presence_snapshot' && Array.isArray(message.data)) {
        message.data.forEach((entry) => applyPresenceUpdate(entry));
        return;
    }
    if (message.type !== 'chat' || !message.data) {
        return;
    }
    const entry = message.data;
    if (!entry.id || messageIdSet.has(entry.id)) {
        return;
    }
    messageIdSet.add(entry.id);
    if (entry.senderUid !== auth.value.uid) {
        playNotifySound();
        flashWindow();
    }
    const activeUid = activeFriend.value?.uid;
    if (
        entry.targetType === 'private' &&
        activeUid &&
        ((entry.senderUid === auth.value.uid && entry.targetUid === activeUid) ||
            (entry.senderUid === activeUid && entry.targetUid === auth.value.uid))
    ) {
        messages.value = [...messages.value, entry];
        nextTick(() => {
            scrollToBottom();
        });
    }
};

const connectWebSocket = () => {
    if (!auth.value.token) {
        return;
    }
    closeWebSocket();
    const ws = new WebSocket(buildWsUrl());
    wsRef.value = ws;
    ws.onopen = () => {
        wsReconnectAttempts = 0;
        wsHeartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, HEARTBEAT_INTERVAL_MS);
        wsPresenceTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'presence_request' }));
            }
        }, PRESENCE_REQUEST_INTERVAL_MS);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
            ws.send(JSON.stringify({ type: 'presence_request' }));
        }
        loadFriends({ silent: true });
        loadRequests({ silent: true });
    };
    ws.onmessage = (event) => handleWsMessage(event.data);
    ws.onerror = () => {
        scheduleReconnect();
    };
    ws.onclose = () => {
        if (wsHeartbeatTimer) {
            clearInterval(wsHeartbeatTimer);
            wsHeartbeatTimer = null;
        }
        if (wsPresenceTimer) {
            clearInterval(wsPresenceTimer);
            wsPresenceTimer = null;
        }
        scheduleReconnect();
    };
};
const openContacts = async () => {
    activeView.value = 'contacts';
    await loadRequests({ silent: true });
};
const toggleSendMenu = () => {
    showSendMenu.value = !showSendMenu.value;
};

const emojiTabs = [
    { id: 'recent', label: '最近' },
    { id: 'smileys', label: '表情' },
    { id: 'gestures', label: '手势' },
    { id: 'nature', label: '自然' },
    { id: 'food', label: '美食' },
    { id: 'objects', label: '物品' }
];

const emojiCatalog = {
    smileys: [
        '😀',
        '😁',
        '😂',
        '🤣',
        '😅',
        '😊',
        '😍',
        '😘',
        '😜',
        '🤪',
        '🤩',
        '😎',
        '🥳',
        '😇',
        '🙂',
        '🙃',
        '😌',
        '😴',
        '🤔',
        '😮',
        '😱',
        '😤',
        '😭',
        '😡',
        '🤯',
        '😬',
        '😷',
        '🤒',
        '🤕',
        '🤢',
        '😈',
        '👿'
    ],
    gestures: [
        '👍',
        '👎',
        '👌',
        '✌️',
        '🤞',
        '🤟',
        '🤘',
        '🤙',
        '👋',
        '🤚',
        '🖐️',
        '👏',
        '🙏',
        '💪',
        '🫶',
        '👐',
        '🤝',
        '☝️',
        '👇',
        '👉',
        '👈',
        '🙌'
    ],
    nature: [
        '🐶',
        '🐱',
        '🐻',
        '🐼',
        '🦊',
        '🐯',
        '🦁',
        '🐮',
        '🐷',
        '🐵',
        '🐸',
        '🐔',
        '🐧',
        '🐦',
        '🦄',
        '🐝',
        '🐢',
        '🐬',
        '🐳',
        '🌸',
        '🌻',
        '🌙',
        '⭐',
        '⚡',
        '🔥',
        '🌈'
    ],
    food: [
        '🍎',
        '🍉',
        '🍊',
        '🍓',
        '🍒',
        '🍑',
        '🥭',
        '🍍',
        '🥑',
        '🍅',
        '🥕',
        '🌽',
        '🍞',
        '🥐',
        '🧀',
        '🍔',
        '🍟',
        '🍕',
        '🍜',
        '🍣',
        '🍰',
        '🍫',
        '🍿',
        '🍩'
    ],
    objects: [
        '🎉',
        '🎁',
        '🎈',
        '🎀',
        '📌',
        '📎',
        '✏️',
        '🖊️',
        '📷',
        '🎧',
        '🎮',
        '💻',
        '📱',
        '📚',
        '🧸',
        '🕯️',
        '🧩',
        '🪄',
        '🗂️',
        '🛎️',
        '🔔',
        '💡',
        '🧷',
        '🧻'
    ]
};

const currentEmojiList = computed(() => {
    if (emojiTab.value === 'recent') {
        if (recentEmojis.value.length) {
            return recentEmojis.value;
        }
        return emojiCatalog.smileys.slice(0, 24);
    }
    return emojiCatalog[emojiTab.value] || [];
});

const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
};

const closeEmojiPicker = () => {
    showEmojiPicker.value = false;
};

const insertAtCursor = (emoji) => {
    const el = composerTextareaRef.value;
    if (!el) {
        draft.value += emoji;
        return;
    }
    const start = Number.isInteger(el.selectionStart)
        ? el.selectionStart
        : draft.value.length;
    const end = Number.isInteger(el.selectionEnd) ? el.selectionEnd : start;
    const current = draft.value;
    draft.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    nextTick(() => {
        el.focus();
        const nextPos = start + emoji.length;
        el.setSelectionRange(nextPos, nextPos);
    });
};

const addEmoji = (emoji) => {
    insertAtCursor(emoji);
    const next = [emoji, ...recentEmojis.value.filter((item) => item !== emoji)];
    recentEmojis.value = next.slice(0, 32);
};

const handleDocumentClick = (event) => {
    if (showSendMenu.value) {
        showSendMenu.value = false;
    }
    if (showEmojiPicker.value) {
        const picker = emojiPickerRef.value;
        const trigger = emojiButtonRef.value;
        if (
            picker &&
            trigger &&
            !picker.contains(event.target) &&
            !trigger.contains(event.target)
        ) {
            closeEmojiPicker();
        }
    }
    if (
        isFriendProfileVisible.value &&
        friendProfileRef.value &&
        !friendProfileRef.value.contains(event.target)
    ) {
        isFriendProfileVisible.value = false;
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

const friendDisplayName = computed(() => {
    if (!friendProfileSource.value) return '';
    return (
        friendProfileSource.value.nickname ||
        friendProfileSource.value.username ||
        `用户${friendProfileSource.value.uid || ''}`
    );
});

const friendInitials = computed(() => {
    const base =
        friendProfileSource.value?.username || friendDisplayName.value || '??';
    return String(base).slice(0, 2).toUpperCase();
});

const friendSignature = computed(() => {
    return friendProfileSource.value?.signature || '这个人很神秘，暂未填写签名';
});

const friendProfileSource = computed(() => friendProfile.value || activeFriend.value);

const nicknameCount = computed(() => editForm.value.nickname.length);
const signatureCount = computed(() => editForm.value.signature.length);

watch(
    () => editForm.value.nickname,
    (value) => {
        if (nicknameInvalid.value && value?.trim()) {
            nicknameInvalid.value = false;
        }
    }
);

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
        return sanitizeText(msg.data?.content || '');
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

const applyPresenceUpdate = (entry) => {
    const uid = Number(entry?.uid);
    if (!Number.isInteger(uid)) return;
    const online = entry?.online === true;
    presenceOverrides.set(uid, online);
    const index = friends.value.findIndex((item) => item.uid === uid);
    if (index === -1) {
        return;
    }
    if (friends.value[index].online === online) return;
    const next = friends.value.slice();
    next[index] = { ...next[index], online };
    friends.value = next;
    lastFriendSignature.value = buildFriendSignature(next);
    if (activeFriend.value?.uid === uid) {
        activeFriend.value = next[index];
    }
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
            if (presenceOverrides.size) {
                next.forEach((item) => {
                    if (presenceOverrides.has(item.uid)) {
                        item.online = presenceOverrides.get(item.uid) === true;
                    }
                });
            }
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

const loadMessages = async (targetUid, { silent, forceScroll } = {}) => {
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
                const shouldStick = forceScroll ? true : isAtBottom();
                messages.value = next;
                messageIdSet = new Set(next.map((item) => item.id).filter(Boolean));
                lastMessageSignature.value = signature;
                if (shouldStick) {
                    await nextTick();
                    scheduleScrollToBottom();
                }
            }
            if (forceScroll && signature === lastMessageSignature.value) {
                await nextTick();
                scheduleScrollToBottom();
            }
        } else {
            if (!silent) {
                messages.value = [];
                messageIdSet = new Set();
                lastMessageSignature.value = '';
            }
        }
    } catch (err) {
        if (!silent) {
            messages.value = [];
            messageIdSet = new Set();
            lastMessageSignature.value = '';
        }
    } finally {
        if (!silent) {
            loading.value = false;
        }
    }
};

const selectFriend = async (friend) => {
    activeFriend.value = friend;
    await loadMessages(friend.uid, { forceScroll: true });
    await nextTick();
    scheduleScrollToBottom();
};

const sendMessage = async () => {
    if (!canSend.value) return;
    const content = sanitizeText(draft.value).trim();
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
            if (data.data?.id && !messageIdSet.has(data.data.id)) {
                messageIdSet.add(data.data.id);
                messages.value = [...messages.value, data.data];
            }
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

const toggleFriendProfile = () => {
    if (!activeFriend.value) return;
    if (!isFriendProfileVisible.value) {
        loadFriendProfile(activeFriend.value.uid);
    }
    isFriendProfileVisible.value = !isFriendProfileVisible.value;
};

const closeFriendProfile = () => {
    isFriendProfileVisible.value = false;
};

const loadFriendProfile = async (uid) => {
    if (!auth.value.token || !uid) return;
    if (friendProfileLoading.value && friendProfile.value?.uid === uid) return;
    friendProfileLoading.value = true;
    try {
        const res = await fetch(`${API_BASE}/api/friends/profile?uid=${uid}`, {
            headers: authHeader()
        });
        const data = await res.json();
        if (res.ok && data?.success && data.user) {
            friendProfile.value = data.user;
        }
    } catch {}
    friendProfileLoading.value = false;
};

const scheduleScrollToBottom = () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(scrollToBottom);
    });
};

const sanitizeText = (value) => {
    return String(value ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[<>]/g, '');
};

onMounted(async () => {
    requestAnimationFrame(() => {
        isReady.value = true;
    });
    await loadAuth();
    await loadProfile();
    await loadFriends();
    await loadRequests();
    connectWebSocket();
    window.addEventListener('click', handleDocumentClick);
});

watch(
    () => auth.value.token,
    (nextToken, prevToken) => {
        if (nextToken && nextToken !== prevToken) {
            loadFriends({ silent: true });
            loadRequests({ silent: true });
            connectWebSocket();
        }
    }
);

onBeforeUnmount(() => {
    window.removeEventListener('click', handleDocumentClick);
    closeWebSocket();
    if (profileHideTimer) {
        clearTimeout(profileHideTimer);
        profileHideTimer = null;
    }
});
</script>

<style scoped>
.app-shell {
    height: 100vh;
    background: radial-gradient(circle at top left, #f5fbff, #eef5ff 45%, #e8f1ff);
    position: relative;
    overflow: hidden;
    opacity: 0;
    transition: opacity 280ms ease;
}

.app-shell.app-enter {
    opacity: 1;
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
    user-select: none;
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
    user-select: none;
    -webkit-app-region: drag;
}


.status-pill {
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(72, 147, 214, 0.14);
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    user-select: none;
}

.topbar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    user-select: none;
    -webkit-app-region: drag;
}

.topbar-right-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    -webkit-app-region: drag;
}

.topbar-right-spacer {
    flex: 1;
    height: 100%;
    -webkit-app-region: drag;
}

.user-card-wrap {
    position: relative;
    -webkit-app-region: no-drag;
    user-select: none;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 0 0 12px 12px;
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
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
    height: auto;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 16px;
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
    align-items: flex-start;
    margin-bottom: 8px;
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
    margin-top: 2px;
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
    justify-content: center;
    padding-bottom: 8px;
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
    opacity: 1;
}

.profile-modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(6px);
    transition: opacity 140ms ease-out, backdrop-filter 140ms ease-out;
}

.profile-modal__panel {
    position: relative;
    width: 520px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 64px);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 255, 0.98));
    border-radius: 18px;
    border: 1px solid rgba(72, 147, 214, 0.2);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
    padding: 20px 22px 18px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    -webkit-app-region: no-drag;
    transform-origin: center;
    transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 200ms ease-out;
    transition-delay: 80ms;
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
    overflow-y: auto;
    padding-right: 6px;
    flex: 1;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
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
    padding-left: 6px;
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

.profile-modal input {
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #fff;
    padding: 10px 12px;
    font-size: 13px;
    color: #1c2436;
    font-family: inherit;
}

.profile-field.is-invalid .profile-field__label {
    color: #dc2626;
}

.profile-field.is-invalid input {
    border-color: rgba(220, 38, 38, 0.65);
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.profile-modal input:focus,
.profile-modal select:focus {
    outline: none;
    border-color: rgba(72, 147, 214, 0.5);
    box-shadow: 0 0 0 3px rgba(72, 147, 214, 0.15);
}

.profile-modal .select-menu {
    box-shadow: none;
    scrollbar-width: none;
}

.profile-modal .select-menu::-webkit-scrollbar {
    display: none;
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

.profile-modal-enter-active,
.profile-modal-leave-active {
    transition: opacity 160ms ease-out;
}

.profile-modal-enter-from,
.profile-modal-leave-to {
    opacity: 0;
}

.profile-modal-enter-from .profile-modal__panel,
.profile-modal-leave-to .profile-modal__panel {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
}

.profile-modal-leave-to .profile-modal__panel {
    transition-delay: 0ms;
}

.profile-modal-enter-from .profile-modal__backdrop,
.profile-modal-leave-to .profile-modal__backdrop {
    opacity: 0;
    backdrop-filter: blur(2px);
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
    user-select: none;
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
    user-select: none;
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
    user-select: none;
}

.list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    user-select: none;
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
    position: relative;
}

.app-shell.app-enter .sidebar,
.app-shell.app-enter .chat {
    opacity: 1;
    transform: translateY(0);
}

.chat-title {
    font-size: 18px;
    font-weight: 700;
    user-select: none;
}

.chat-title.clickable {
    cursor: pointer;
}

.chat-title.clickable:hover {
    color: #1d4ed8;
}

.chat-sub {
    font-size: 12px;
    color: var(--ink-soft);
    user-select: none;
}

.chat-actions {
    display: flex;
    gap: 8px;
    user-select: none;
    -webkit-app-region: drag;
    
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

.friend-profile-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 22px;
    width: 320px;
    background: linear-gradient(145deg, #ffffff, #f2f5fb);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 18px 48px rgba(22, 32, 52, 0.16);
    border: 1px solid rgba(31, 65, 120, 0.12);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 180ms ease, transform 220ms ease;
    pointer-events: none;
    z-index: 5;
}

.friend-profile-popover.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
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
    user-select: none;
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
    max-height: 210px;
}

.composer-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px 2px;
    position: relative;
    user-select: none;
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

.tool-icon-btn.is-active {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.3);
    color: #1d4ed8;
}

.tool-glyph {
    font-family: "Segoe MDL2 Assets";
    font-size: 16px;
}

.emoji-panel {
    position: absolute;
    left: 0;
    bottom: calc(100% + 10px);
    width: 360px;
    background: linear-gradient(180deg, #f9fcff 0%, #ffffff 100%);
    border-radius: 18px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
    padding: 12px;
    z-index: 6;
}

.emoji-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.emoji-tab {
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.9);
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
    cursor: pointer;
    color: #334155;
    font-weight: 600;
}

.emoji-tab.active {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.28);
    color: #1d4ed8;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
}

.emoji-btn {
    width: 36px;
    height: 34px;
    border-radius: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 18px;
    transition: background 0.2s;
}

.emoji-btn:hover {
    background: rgba(15, 23, 42, 0.08);
}

.emoji-empty {
    font-size: 12px;
    color: rgba(15, 23, 42, 0.5);
    padding: 16px 0;
    text-align: center;
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
    user-select: none;
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
    user-select: none;
}
</style>
